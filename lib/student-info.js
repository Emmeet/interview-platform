/**
 * 实习就业跟踪：配置表 + 学生信息表
 */
import { getPool } from './db';
import { canonicalDestination, salaryDisplay } from './intern-fields';
import { PENDING, assessRecord, deriveSopStatus } from './assessment';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function toIso(v) {
  if (v instanceof Date) return v.toISOString();
  return v ? String(v) : '';
}

function str(v) {
  return String(v == null ? '' : v).trim();
}

export const TRACKING_TYPES = ['实习', '就业'];

export function normalizeTrackingType(v) {
  const t = str(v);
  if (t === '就业' || t === 'job' || t === 'employment') return '就业';
  return '实习';
}

function rowToConfig(row) {
  return {
    id: Number(row.id),
    title: row.title,
    type: normalizeTrackingType(row.type),
    isActive: Number(row.is_active) === 1,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function rowToInfo(row) {
  return {
    id: Number(row.id),
    configId: Number(row.config_id),
    configTitle: row.config_title || '',
    configType: normalizeTrackingType(row.config_type),
    studentName: row.student_name || '',
    studentId: row.student_id || '',
    className: row.class_name || '',
    hometown: row.hometown || '',
    trainingDirection: row.training_direction || '',
    gender: row.gender || '',
    phone: row.phone || '',
    destination: row.destination || '',
    internCompany: row.intern_company || '',
    internLocation: row.intern_location || '',
    internContact: row.intern_contact || '',
    internContactPhone: row.intern_contact_phone || '',
    businessLine: row.business_line || '',
    internPosition: row.intern_position || '',
    internSalary: row.intern_salary || '',
    internStartDate: row.intern_start_date || '',
    internEndDate: row.intern_end_date || '',
    gradSchool: row.grad_school || '',
    gradMajor: row.grad_major || '',
    remark: row.remark || '',
    jobCategory: row.job_category || '待判定',
    sopStatus: row.sop_status || '待判定',
    starStatus: row.star_status || '待判定',
    qualityStatus: row.quality_status || '待判定',
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function normalizeInfo(input) {
  const item = input && typeof input === 'object' ? input : {};
  return {
    id: item.id ? Number(item.id) : 0,
    configId: Number(item.configId || 0),
    studentName: str(item.studentName),
    studentId: str(item.studentId),
    className: str(item.className),
    hometown: str(item.hometown),
    trainingDirection: str(item.trainingDirection),
    gender: str(item.gender),
    phone: str(item.phone),
    destination: canonicalDestination(str(item.destination)),
    internCompany: str(item.internCompany),
    internLocation: str(item.internLocation),
    internContact: str(item.internContact),
    internContactPhone: str(item.internContactPhone),
    businessLine: str(item.businessLine),
    internPosition: str(item.internPosition),
    internSalary: salaryDisplay(str(item.internSalary)),
    internStartDate: str(item.internStartDate),
    internEndDate: str(item.internEndDate),
    gradSchool: str(item.gradSchool),
    gradMajor: str(item.gradMajor),
    remark: str(item.remark),
  };
}

const INFO_SELECT = `SELECT s.*, c.title AS config_title, c.type AS config_type
  FROM student_info s
  LEFT JOIN tracking_configs c ON c.id = s.config_id`;

export async function listTrackingConfigs({ includeInactive } = {}) {
  const pool = await getPool();
  const sql = includeInactive
    ? 'SELECT * FROM tracking_configs ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM tracking_configs WHERE is_active = 1 ORDER BY sort_order ASC, id ASC';
  const [rows] = await pool.query(sql);
  return rows.map(rowToConfig);
}

export async function lookupStudentInfo({ configId, studentName, studentId }) {
  const cid = Number(configId);
  const name = str(studentName);
  const sid = str(studentId);
  if (!cid) throw new ValidationError('请选择跟踪项目');
  if (!name) throw new ValidationError('请填写姓名');
  if (!sid) throw new ValidationError('请填写学号');

  const pool = await getPool();
  const [exact] = await pool.query(
    `${INFO_SELECT} WHERE s.config_id = ? AND s.student_name = ? AND s.student_id = ? LIMIT 1`,
    [cid, name, sid]
  );
  if (exact.length) {
    return { found: true, record: rowToInfo(exact[0]), nameMismatch: false };
  }

  const [byId] = await pool.query(
    `${INFO_SELECT} WHERE s.config_id = ? AND s.student_id = ? LIMIT 1`,
    [cid, sid]
  );
  if (byId.length) {
    return { found: true, record: rowToInfo(byId[0]), nameMismatch: true };
  }
  return { found: false, record: null, nameMismatch: false };
}

export async function listStudentInfo(configId) {
  const pool = await getPool();
  const cid = Number(configId || 0);
  const sql = cid
    ? `${INFO_SELECT} WHERE s.config_id = ? ORDER BY s.id DESC`
    : `${INFO_SELECT} ORDER BY s.id DESC`;
  const [rows] = cid ? await pool.query(sql, [cid]) : await pool.query(sql);
  return rows.map(rowToInfo);
}

const COLS = [
  'config_id', 'student_name', 'student_id', 'class_name', 'hometown', 'training_direction',
  'gender', 'phone', 'destination', 'intern_company', 'intern_location', 'intern_contact',
  'intern_contact_phone', 'business_line', 'intern_position', 'intern_salary',
  'intern_start_date', 'intern_end_date', 'grad_school', 'grad_major', 'remark',
];

function infoValues(item) {
  return [
    item.configId, item.studentName, item.studentId, item.className, item.hometown,
    item.trainingDirection, item.gender, item.phone, item.destination, item.internCompany,
    item.internLocation, item.internContact, item.internContactPhone, item.businessLine,
    item.internPosition, item.internSalary, item.internStartDate, item.internEndDate,
    item.gradSchool, item.gradMajor, item.remark,
  ];
}

/** 判定字段：新建记录时按规则写入，后续由人工或批量判定调整。 */
const ASSESS_COLS = ['job_category', 'sop_status', 'star_status'];

function assessValues(item) {
  const { jobCategory, sopStatus, starStatus } = assessRecord(item);
  return [jobCategory, sopStatus, starStatus];
}

const INSERT_COLS = [...COLS, ...ASSESS_COLS];
const INSERT_PLACEHOLDERS = INSERT_COLS.map(() => '?').join(', ');

function insertValues(item) {
  return [...infoValues(item), ...assessValues(item)];
}

export async function upsertStudentInfo(input) {
  const item = normalizeInfo(input);
  if (!item.configId) throw new ValidationError('请选择跟踪项目');
  if (!item.studentName) throw new ValidationError('姓名为必填项');
  if (!item.studentId) throw new ValidationError('学号为必填项');
  if (!item.className) throw new ValidationError('班级为必填项');
  if (!item.destination) throw new ValidationError('毕业后去向为必填项');

  const pool = await getPool();
  const [cfg] = await pool.query('SELECT id FROM tracking_configs WHERE id = ? AND is_active = 1', [item.configId]);
  if (!cfg.length) throw new ValidationError('跟踪项目不存在或已停用');

  const [exist] = await pool.query(
    'SELECT id FROM student_info WHERE config_id = ? AND student_id = ? LIMIT 1',
    [item.configId, item.studentId]
  );
  const existed = exist.length > 0;

  // ON DUPLICATE KEY UPDATE 只覆盖 COLS，判定字段在更新时保留原值
  const updates = COLS
    .filter((c) => c !== 'config_id' && c !== 'student_id')
    .map((c) => `${c} = VALUES(${c})`)
    .join(', ');

  await pool.query(
    `INSERT INTO student_info (${INSERT_COLS.join(', ')}) VALUES (${INSERT_PLACEHOLDERS})
     ON DUPLICATE KEY UPDATE ${updates}`,
    insertValues(item)
  );

  const [rows] = await pool.query(
    `${INFO_SELECT} WHERE s.config_id = ? AND s.student_id = ? LIMIT 1`,
    [item.configId, item.studentId]
  );
  return { record: rows.length ? rowToInfo(rows[0]) : null, created: !existed };
}

export async function updateStudentAssessment(id, input) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) throw new ValidationError('无效的记录 ID');
  // 只更新请求里给出的字段：未提供的判定（如自动派生的 SOP）保持库中原值
  const source = input && typeof input === 'object' ? input : {};
  const fields = [
    ['job_category', str(source.jobCategory)],
    ['sop_status', str(source.sopStatus)],
    ['star_status', str(source.starStatus)],
    ['quality_status', str(source.qualityStatus)],
  ].filter(([, value]) => value);
  if (!fields.length) throw new ValidationError('没有需要更新的判定字段');
  const pool = await getPool();
  const [res] = await pool.query(
    `UPDATE student_info SET ${fields.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`,
    [...fields.map(([, value]) => value), numId]
  );
  if (!res.affectedRows) throw new ValidationError('记录不存在或已被删除');
  const [rows] = await pool.query(`${INFO_SELECT} WHERE s.id = ? LIMIT 1`, [numId]);
  return rows.length ? rowToInfo(rows[0]) : null;
}

/**
 * 按规则批量判定。
 * overwrite=false（默认）只补写仍为「待判定」的字段，人工判定保持不动；
 * overwrite=true 时三个字段一律按规则覆盖。返回 { assessed, kept, total }。
 */
export async function assessStudentInfoBatch(configId, { overwrite = false } = {}) {
  const cid = Number(configId);
  if (!Number.isInteger(cid) || cid <= 0) throw new ValidationError('请指定跟踪项目');
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT id, job_category, sop_status, star_status, destination,
            intern_company, intern_salary, intern_position
       FROM student_info WHERE config_id = ?`,
    [cid]
  );

  let assessed = 0;
  let kept = 0;
  for (const row of rows) {
    const next = assessRecord({
      destination: row.destination,
      internCompany: row.intern_company,
      internSalary: row.intern_salary,
      internPosition: row.intern_position,
    });
    const jobCategory = overwrite || row.job_category === PENDING ? next.jobCategory : row.job_category;
    const ruleSop = deriveSopStatus(jobCategory);
    const sopStatus = overwrite || row.sop_status === PENDING ? ruleSop : row.sop_status;
    const starStatus = overwrite || row.star_status === PENDING ? next.starStatus : row.star_status;

    if (jobCategory === row.job_category && sopStatus === row.sop_status && starStatus === row.star_status) {
      kept += 1;
      continue;
    }
    await pool.query(
      'UPDATE student_info SET job_category = ?, sop_status = ?, star_status = ? WHERE id = ?',
      [jobCategory, sopStatus, starStatus, row.id]
    );
    assessed += 1;
  }
  return { assessed, kept, total: rows.length };
}

export async function deleteStudentInfoRow(id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) throw new ValidationError('无效的记录 ID');
  const pool = await getPool();
  const [res] = await pool.query('DELETE FROM student_info WHERE id = ?', [numId]);
  return res.affectedRows > 0;
}

/** 清空指定跟踪项目的全部学生档案，返回删除条数。 */
export async function clearStudentInfo(configId) {
  const cid = Number(configId);
  if (!Number.isInteger(cid) || cid <= 0) throw new ValidationError('请指定跟踪项目');
  const pool = await getPool();
  const [res] = await pool.query('DELETE FROM student_info WHERE config_id = ?', [cid]);
  return res.affectedRows || 0;
}

const EXISTING_CHUNK = 500;

/**
 * 逐条写入学生信息（失败即停，无事务、无重试）。
 * 导入只新增：学号已存在的记录保留原值不覆盖，计入 existing；
 * 文件内重复学号与缺姓名/学号记入 issues（带 Excel 行号）并计入 skipped。
 * 成功返回 { imported, existing, skipped, issues }。
 * 写入或库初始化异常把 imported/existing/skipped/issues/sourceRow 挂到 error 上，
 * imported 仅为已完成写入条数，供路由返回 { error, imported, existing, skipped, issues }。
 */
export async function batchCreateStudentInfo(items, configId) {
  const cid = Number(configId);
  if (!Number.isInteger(cid) || cid <= 0) {
    const error = new ValidationError('请指定跟踪项目');
    error.imported = 0;
    error.existing = 0;
    error.skipped = 0;
    error.issues = [{ code: 'INVALID_CONFIG', message: '请指定跟踪项目' }];
    throw error;
  }

  let imported = 0;
  let existing = 0;
  let skipped = 0;
  const issues = [];

  let pool;
  try {
    pool = await getPool();
    const [cfg] = await pool.query('SELECT id FROM tracking_configs WHERE id = ?', [cid]);
    if (!cfg.length) throw new ValidationError('跟踪项目不存在');
  } catch (error) {
    error.imported = 0;
    error.existing = 0;
    error.skipped = 0;
    if (error.name === 'ValidationError') {
      error.issues = [{ code: 'INVALID_CONFIG', message: error.message }];
    } else if (!Array.isArray(error.issues)) {
      error.issues = [];
    }
    throw error;
  }

  const pending = [];
  for (const raw of Array.isArray(items) ? items : []) {
    const item = normalizeInfo({ ...raw, configId: cid });
    const sourceRow = Number(raw && raw.sourceRow);
    const row = Number.isInteger(sourceRow) && sourceRow > 0 ? sourceRow : 0;
    if (!item.studentName || !item.studentId) {
      skipped += 1;
      const fields = [];
      if (!item.studentName) fields.push('studentName');
      if (!item.studentId) fields.push('studentId');
      issues.push({
        ...(row ? { row } : {}),
        code: 'MISSING_REQUIRED',
        fields,
        message: `${row ? `Excel 第 ${row} 行` : '记录'}缺少必填字段：${fields.map((f) => (f === 'studentName' ? '姓名' : '学号')).join('、')}`,
      });
      continue;
    }
    if (!item.className) item.className = '';
    pending.push({ item, row });
  }

  const existingIds = new Set();
  const uniqueIds = [...new Set(pending.map(({ item }) => item.studentId))];
  try {
    for (let i = 0; i < uniqueIds.length; i += EXISTING_CHUNK) {
      const chunk = uniqueIds.slice(i, i + EXISTING_CHUNK);
      const [rows] = await pool.query(
        `SELECT student_id FROM student_info
         WHERE config_id = ? AND student_id IN (${chunk.map(() => '?').join(', ')})`,
        [cid, ...chunk]
      );
      rows.forEach((r) => existingIds.add(r.student_id));
    }
  } catch (error) {
    error.imported = imported;
    error.existing = existing;
    error.skipped = skipped;
    error.issues = issues;
    throw error;
  }

  const inserted = new Set();
  for (const { item, row } of pending) {
    if (existingIds.has(item.studentId)) {
      existing += 1;
      continue;
    }
    if (inserted.has(item.studentId)) {
      skipped += 1;
      issues.push({
        ...(row ? { row } : {}),
        code: 'DUPLICATE_STUDENT_ID',
        fields: ['studentId'],
        message: `${row ? `Excel 第 ${row} 行` : '记录'}学号 ${item.studentId} 在本表中重复，只保留首次出现的行`,
      });
      continue;
    }
    inserted.add(item.studentId);
    try {
      await pool.query(
        `INSERT INTO student_info (${INSERT_COLS.join(', ')}) VALUES (${INSERT_PLACEHOLDERS})`,
        insertValues(item)
      );
      imported += 1;
    } catch (error) {
      error.imported = imported;
      error.existing = existing;
      error.skipped = skipped;
      error.issues = issues;
      if (row) error.sourceRow = row;
      throw error;
    }
  }
  return { imported, existing, skipped, issues };
}
