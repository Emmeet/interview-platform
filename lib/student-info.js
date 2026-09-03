/**
 * 实习就业跟踪：配置表 + 学生信息表
 */
import { getPool } from './db';

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
    destination: str(item.destination),
    internCompany: str(item.internCompany),
    internLocation: str(item.internLocation),
    internContact: str(item.internContact),
    internContactPhone: str(item.internContactPhone),
    businessLine: str(item.businessLine),
    internPosition: str(item.internPosition),
    internSalary: str(item.internSalary),
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

  const placeholders = COLS.map(() => '?').join(', ');
  const updates = COLS
    .filter((c) => c !== 'config_id' && c !== 'student_id')
    .map((c) => `${c} = VALUES(${c})`)
    .join(', ');

  await pool.query(
    `INSERT INTO student_info (${COLS.join(', ')}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    infoValues(item)
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
  const jobCategory = str(input.jobCategory) || '待判定';
  const sopStatus = str(input.sopStatus) || '待判定';
  const starStatus = str(input.starStatus) || '待判定';
  const pool = await getPool();
  const [res] = await pool.query(
    'UPDATE student_info SET job_category = ?, sop_status = ?, star_status = ? WHERE id = ?',
    [jobCategory, sopStatus, starStatus, numId]
  );
  if (!res.affectedRows) throw new ValidationError('记录不存在或已被删除');
  const [rows] = await pool.query(`${INFO_SELECT} WHERE s.id = ? LIMIT 1`, [numId]);
  return rows.length ? rowToInfo(rows[0]) : null;
}

export async function deleteStudentInfoRow(id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) throw new ValidationError('无效的记录 ID');
  const pool = await getPool();
  const [res] = await pool.query('DELETE FROM student_info WHERE id = ?', [numId]);
  return res.affectedRows > 0;
}

export async function batchCreateStudentInfo(items, configId) {
  const cid = Number(configId);
  if (!cid) throw new ValidationError('请指定跟踪项目');
  const pool = await getPool();
  const [cfg] = await pool.query('SELECT id FROM tracking_configs WHERE id = ?', [cid]);
  if (!cfg.length) throw new ValidationError('跟踪项目不存在');

  let imported = 0;
  let skipped = 0;
  for (const raw of Array.isArray(items) ? items : []) {
    const item = normalizeInfo({ ...raw, configId: cid });
    if (!item.studentName || !item.studentId) {
      skipped++;
      continue;
    }
    if (!item.className) item.className = '';
    const placeholders = COLS.map(() => '?').join(', ');
    const updates = COLS
      .filter((c) => c !== 'config_id' && c !== 'student_id')
      .map((c) => `${c} = VALUES(${c})`)
      .join(', ');
    await pool.query(
      `INSERT INTO student_info (${COLS.join(', ')}) VALUES (${placeholders})
       ON DUPLICATE KEY UPDATE ${updates}`,
      infoValues(item)
    );
    imported++;
  }
  return { imported, skipped };
}
