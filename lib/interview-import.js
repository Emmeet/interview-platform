import { findCol } from './client-storage.js';

const NAME_KEYS = ['姓名', '学生姓名', '学生序号'];
const COMPANY_KEYS = ['单位名称', '单位', '公司'];
const JD_KEYS = ['岗位JD', 'JD', '招聘', '岗位描述', '岗位要求', '任职'];
const POSITION_KEYS_LONG = ['规范岗位名称', '岗位名称', '岗位', '职位'];
const POSITION_KEYS_WIDE = ['规范岗位名称', '岗位', '职位'];

function collectKeys(rows) {
  const seen = new Set();
  const keys = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key === '__rowNum__' || seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

function headerMatches(keys, keywords) {
  return keywords.some((kw) => keys.some((key) => key && String(key).includes(kw)));
}

function hasQuestionHeader(keys) {
  return keys.some((key) => {
    const text = String(key || '');
    if (text.includes('面试问题')) return true;
    if (text.includes('问题') && !text.includes('序号')) return true;
    return false;
  });
}

/** 矩阵需 blankrows:true，表头在第 0 行，行下标即 Excel 0-based 行号。 */
function toObjectRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  if (!Array.isArray(rows[0])) return rows;
  const headers = (rows[0] || []).map((cell) => String(cell ?? ''));
  const objects = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i] || [];
    const row = { __rowNum__: i };
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) row[headers[j]] = cells[j];
    }
    objects.push(row);
  }
  return objects;
}

function physicalRow(row, dataIndex) {
  const num = Number(row && row.__rowNum__);
  if (Number.isFinite(num)) return num + 1;
  return dataIndex + 2;
}

function isBlankRow(row) {
  return Object.keys(row).every((key) => {
    if (key === '__rowNum__') return true;
    return String(row[key] ?? '').trim() === '';
  });
}

function missingIdentityIssue(row, name, company) {
  const fields = [];
  const reasons = [];
  if (!name) {
    fields.push('姓名');
    reasons.push('缺少学生标识（姓名/学生姓名/学生序号）');
  }
  if (!company) {
    fields.push('单位名称');
    reasons.push('缺少单位名称');
  }
  return {
    row,
    code: 'MISSING_REQUIRED',
    fields,
    message: reasons.join('；'),
  };
}

function missingHeadersIssue(keys) {
  const fields = [];
  const missing = [];
  if (!headerMatches(keys, NAME_KEYS)) {
    fields.push('姓名');
    missing.push('姓名（或学生姓名、学生序号）');
  }
  if (!headerMatches(keys, COMPANY_KEYS)) {
    fields.push('单位名称');
    missing.push('单位名称（或单位、公司）');
  }
  if (!hasQuestionHeader(keys)) {
    fields.push('面试问题');
    missing.push('面试问题');
  }
  if (!missing.length) return null;
  return {
    row: 1,
    code: 'MISSING_HEADERS',
    fields,
    message: '缺少必需表头：' + missing.join('、') + '。实际识别到：' + (keys.join('、') || '（空表头）'),
  };
}

function toItem(group, sourceRow) {
  return {
    studentName: group.studentName,
    studentId: group.studentId,
    department: group.department,
    company: group.company,
    position: group.position,
    jdText: group.jdText,
    questions: group.questions,
    result: group.result,
    sourceRow,
  };
}

/**
 * 解析面试记录表。
 * 长表（含问题序号）：按 单位+岗位+学生+轮次 聚合，问题按题号排序。
 * 宽表：一场面试一行，面试问题按换行/分号切分。
 * 返回 { items, skipped, total, issues }；items[].sourceRow 与 issues[].row 均为 Excel 物理行号（1-based）。
 * 对象行使用 xlsx 的 __rowNum__（0-based）；矩阵行需 blankrows:true 以保持空行位置。
 */
export function parseRecordsSheet(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return {
      items: [],
      skipped: 0,
      total: 0,
      issues: [{ row: 1, code: 'EMPTY_SHEET', message: '工作表没有数据行' }],
    };
  }

  const objectRows = toObjectRows(rows);
  const total = objectRows.length;
  if (!objectRows.length) {
    return {
      items: [],
      skipped: 0,
      total: 0,
      issues: [{ row: 1, code: 'EMPTY_SHEET', message: '工作表没有数据行' }],
    };
  }

  const headerIssue = missingHeadersIssue(collectKeys(objectRows));
  if (headerIssue) {
    return { items: [], skipped: 0, total, issues: [headerIssue] };
  }

  const issues = [];
  let skipped = 0;

  function takeIdentity(row, dataIndex) {
    const sourceRow = physicalRow(row, dataIndex);
    const name = String(findCol(row, NAME_KEYS) || '').trim();
    const company = String(findCol(row, COMPANY_KEYS) || '').trim();
    if (isBlankRow(row)) {
      skipped++;
      return null;
    }
    if (!name || !company) {
      skipped++;
      issues.push(missingIdentityIssue(sourceRow, name, company));
      return null;
    }
    return { name, company, sourceRow };
  }

  // 长表（一行一个问题，含问题序号列）：按 单位+岗位+学生+轮次 聚合
  if (objectRows.some((row) => findCol(row, ['问题序号']) !== '')) {
    const groups = new Map();
    objectRows.forEach((row, dataIndex) => {
      const identity = takeIdentity(row, dataIndex);
      if (!identity) return;
      const position = String(findCol(row, POSITION_KEYS_LONG) || '').trim();
      const round = String(findCol(row, ['面试轮次', '轮次']) || '').trim();
      const key = [identity.company, position, identity.name, round].join('||');
      if (!groups.has(key)) {
        groups.set(key, {
          studentName: identity.name,
          studentId: String(findCol(row, ['学号']) || '').trim(),
          department: String(findCol(row, ['部门', '院系', '学院']) || '').trim(),
          company: identity.company,
          position,
          jdText: String(findCol(row, JD_KEYS) || '').trim(),
          questions: [],
          result: String(findCol(row, ['面试结果', '结果']) || '').trim(),
          sourceRow: identity.sourceRow,
        });
      }
      const group = groups.get(key);
      const question = String(findCol(row, ['面试问题', '问题']) || '').trim();
      if (question) {
        group.questions.push({
          n: Number(findCol(row, ['问题序号'])) || group.questions.length + 1,
          q: question,
        });
      }
      const jd = String(findCol(row, ['岗位JD']) || '').trim();
      if (!group.jdText && jd) group.jdText = jd;
    });
    const items = [...groups.values()].map((group) => toItem({
      ...group,
      questions: group.questions.sort((a, b) => a.n - b.n).map((item) => item.q),
    }, group.sourceRow));
    return { items, skipped, total, issues };
  }

  // 宽表（一行一场面试，多问题在单元格内换行）
  const items = [];
  objectRows.forEach((row, dataIndex) => {
    const identity = takeIdentity(row, dataIndex);
    if (!identity) return;
    const rawQuestions = String(findCol(row, ['面试问题', '问题']) || '').trim();
    const questions = rawQuestions
      ? rawQuestions.split(/[\n\r|；;]/).map((part) => part.trim()).filter(Boolean)
      : [];
    items.push(toItem({
      studentName: identity.name,
      studentId: String(findCol(row, ['学号']) || '').trim(),
      department: String(findCol(row, ['部门', '院系', '学院']) || '').trim(),
      company: identity.company,
      position: String(findCol(row, POSITION_KEYS_WIDE) || '').trim(),
      jdText: String(findCol(row, JD_KEYS) || '').trim(),
      questions,
      result: String(findCol(row, ['面试结果', '结果']) || '').trim(),
    }, identity.sourceRow));
  });
  return { items, skipped, total, issues };
}
