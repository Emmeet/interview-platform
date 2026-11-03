/**
 * 面试记录数据访问层：负责 MySQL 读写与 行记录 <-> 前端对象 的字段映射
 */
import { getPool } from './db';
import { normalizePosition } from './position-normalize';

/** 业务校验错误（HTTP 400），区别于数据库故障（HTTP 500） */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function parseQuestions(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function toIso(v) {
  if (v instanceof Date) return v.toISOString();
  return v ? String(v) : '';
}

/** 数据库行 -> 前端记录对象 */
function rowToRecord(row) {
  return {
    id: Number(row.id),
    studentName: row.student_name,
    studentId: row.student_id || '',
    department: row.department || '',
    company: row.company,
    position: row.position || '',
    positionStd: normalizePosition(row.position || ''),
    jdText: row.jd_text || '',
    questions: parseQuestions(row.questions),
    result: row.result || '',
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/** 入参规整：全部转安全字符串并去空白 */
function normalizeItem(input) {
  const item = input && typeof input === 'object' ? input : {};
  const questions = (Array.isArray(item.questions) ? item.questions : [])
    .map((q) => String(q || '').trim())
    .filter(Boolean);
  return {
    studentName: String(item.studentName || '').trim(),
    studentId: String(item.studentId || '').trim(),
    department: String(item.department || '').trim(),
    company: String(item.company || '').trim(),
    position: String(item.position || '').trim(),
    jdText: String(item.jdText || '').trim(),
    questions,
    result: String(item.result || '').trim(),
  };
}

/** 查询全部记录（新记录在前） */
export async function listRecords() {
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM interview_records ORDER BY id DESC');
  return rows.map(rowToRecord);
}

/** 新增一条记录，返回含审计时间的完整记录 */
export async function createRecord(input) {
  const item = normalizeItem(input);
  if (!item.studentName || !item.company || !item.position || !item.jdText) {
    throw new ValidationError('姓名、单位名称、岗位、岗位招聘要求为必填项');
  }
  if (item.questions.length === 0) {
    throw new ValidationError('至少填写一条面试问题');
  }

  const pool = await getPool();
  const [res] = await pool.query(
    `INSERT INTO interview_records
       (student_name, student_id, department, company, position, jd_text, questions, result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.studentName,
      item.studentId,
      item.department,
      item.company,
      item.position,
      item.jdText,
      JSON.stringify(item.questions),
      item.result,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM interview_records WHERE id = ?', [res.insertId]);
  return rows.length ? rowToRecord(rows[0]) : null;
}

/** 删除记录，返回是否删除成功 */
export async function deleteRecord(id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    throw new ValidationError('无效的记录 ID');
  }
  const pool = await getPool();
  const [res] = await pool.query('DELETE FROM interview_records WHERE id = ?', [numId]);
  return res.affectedRows > 0;
}

function sourceRowOf(raw) {
  const n = Number(raw && raw.sourceRow);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/**
 * Excel 批量导入：逐条校验，跳过缺姓名或单位的行并记入 issues（row 取 item.sourceRow，即 Excel 物理行号）。
 * 合法数据一次性批量 INSERT；失败即停，不重试、不跳过写库错误。
 * 返回 { imported, skipped, issues }；imported 为已完成写入数量（该 INSERT 失败则为 0）。
 */
export async function batchCreateRecords(items) {
  const rows = [];
  const sourceRows = [];
  const issues = [];
  let skipped = 0;
  for (const raw of Array.isArray(items) ? items : []) {
    const item = normalizeItem(raw);
    const sourceRow = sourceRowOf(raw);
    if (!item.studentName || !item.company) {
      skipped++;
      const fields = [];
      const reasons = [];
      if (!item.studentName) {
        fields.push('姓名');
        reasons.push('缺少学生标识（姓名）');
      }
      if (!item.company) {
        fields.push('单位名称');
        reasons.push('缺少单位名称');
      }
      issues.push({
        row: sourceRow,
        code: 'MISSING_REQUIRED',
        fields,
        message: reasons.join('；'),
      });
      continue;
    }
    rows.push([
      item.studentName,
      item.studentId,
      item.department,
      item.company,
      item.position,
      item.jdText,
      JSON.stringify(item.questions),
      item.result,
    ]);
    sourceRows.push(sourceRow);
  }

  if (rows.length) {
    try {
      const placeholders = rows.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const pool = await getPool();
      await pool.query(
        `INSERT INTO interview_records
           (student_name, student_id, department, company, position, jd_text, questions, result)
         VALUES ${placeholders}`,
        rows.flat()
      );
    } catch (e) {
      if (e && typeof e === 'object') {
        e.importSkipped = skipped;
        e.importIssues = issues;
        const match = String(e.sqlMessage || '').match(/\bat row (\d+)\b/i);
        const row = match ? sourceRows[Number(match[1]) - 1] : undefined;
        if (row) e.sourceRow = row;
      }
      throw e;
    }
  }
  return { imported: rows.length, skipped, issues };
}
