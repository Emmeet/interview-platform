/**
 * 实习就业跟踪：配置表 + 学生信息表
 */
import { getPool } from './db.js';
import { canonicalDestination, salaryDisplay } from './intern-fields.js';
import { JOB_CATEGORY_OPTIONS, PENDING, assessRecord, deriveSopStatus } from './assessment.js';
import {
  COMPANY_CATEGORY_OPTIONS,
  canonicalEmploymentDestination,
  employmentFieldError,
  isEmploymentCompanyDestination,
  isEmploymentSuccessDestination,
  normalizeCompanyCategory,
} from './employment-fields.js';

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
    employmentProvince: row.employment_province || '',
    employmentCity: row.employment_city || '',
    sameInternCompany: row.same_intern_company || '',
    sameInternPosition: row.same_intern_position || '',
    companyCategory: row.company_category || PENDING,
    gradSchool: row.grad_school || '',
    gradMajor: row.grad_major || '',
    remark: row.remark || '',
    jobCategory: row.job_category || '待判定',
    sopStatus: row.sop_status || '待判定',
    starStatus: row.star_status || '待判定',
    qualityStatus: row.quality_status || '待判定',
    jobCategoryManual: Number(row.job_category_manual) === 1,
    starStatusManual: Number(row.star_status_manual) === 1,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function normalizeInfo(input, configType = '实习') {
  const item = input && typeof input === 'object' ? input : {};
  const type = normalizeTrackingType(configType);
  return {
    id: item.id ? Number(item.id) : 0,
    configId: Number(item.configId || 0),
    configType: type,
    studentName: str(item.studentName),
    studentId: str(item.studentId),
    className: str(item.className),
    hometown: str(item.hometown),
    trainingDirection: str(item.trainingDirection),
    gender: str(item.gender),
    phone: str(item.phone),
    destination: type === '就业'
      ? canonicalEmploymentDestination(item.destination)
      : canonicalDestination(str(item.destination)),
    internCompany: str(item.internCompany),
    internLocation: str(item.internLocation),
    internContact: str(item.internContact),
    internContactPhone: str(item.internContactPhone),
    businessLine: str(item.businessLine),
    internPosition: str(item.internPosition),
    internSalary: salaryDisplay(str(item.internSalary)),
    internStartDate: str(item.internStartDate),
    internEndDate: str(item.internEndDate),
    employmentProvince: str(item.employmentProvince),
    employmentCity: str(item.employmentCity),
    sameInternCompany: str(item.sameInternCompany),
    sameInternPosition: str(item.sameInternPosition),
    companyCategory: normalizeCompanyCategory(item.companyCategory),
    gradSchool: str(item.gradSchool),
    gradMajor: str(item.gradMajor),
    remark: str(item.remark),
  };
}

const INFO_SELECT = `SELECT s.*, c.title AS config_title, c.type AS config_type
  FROM student_info s
  LEFT JOIN tracking_configs c ON c.id = s.config_id`;

const BASIC_FIELDS = ['studentName', 'studentId', 'className', 'hometown', 'trainingDirection', 'gender', 'phone'];

function basicInfo(record, fallback = null) {
  return Object.fromEntries(BASIC_FIELDS.map((key) => [key, record[key] || fallback?.[key] || '']));
}

function cohort(title) {
  return String(title || '').match(/(\d{4})\s*届/)?.[1] || '';
}

async function trackingConfig(pool, configId, activeOnly = false) {
  const [rows] = await pool.query(
    `SELECT * FROM tracking_configs WHERE id = ?${activeOnly ? ' AND is_active = 1' : ''} LIMIT 1`,
    [configId]
  );
  if (!rows.length) throw new ValidationError('跟踪项目不存在或已停用');
  return rowToConfig(rows[0]);
}

/** 只按同届、姓名及学号匹配实习来源，绝不从其它届次或其它学生带出信息。 */
async function internshipSource(pool, config, studentName, studentId) {
  const year = cohort(config.title);
  if (config.type !== '就业' || !year) return null;
  const [rows] = await pool.query(
    `${INFO_SELECT} WHERE c.type = '实习' AND s.student_id = ?
     ORDER BY s.updated_at DESC, s.id DESC`,
    [studentId]
  );
  const sameCohort = rows.filter((entry) => cohort(entry.config_title) === year);
  const row = sameCohort.find((entry) => entry.student_name === studentName);
  if (!row && sameCohort.length) throw new ValidationError('姓名与同届实习记录不一致，请核对姓名和学号');
  return row ? rowToInfo(row) : null;
}

function internshipReference(record) {
  if (!record) return null;
  return {
    configId: record.configId,
    configTitle: record.configTitle,
    internCompany: record.internCompany,
    internPosition: record.internPosition,
  };
}

/** 保存前清除不再适用的就业分支，防止离职/备考仍携带旧公司、薪资和院校。 */
function clearInactiveEmploymentFields(item) {
  if (item.configType !== '就业') return;
  for (const key of ['internContact', 'internContactPhone', 'businessLine', 'internStartDate', 'internEndDate']) {
    item[key] = '';
  }
  if (isEmploymentCompanyDestination(item.destination)) {
    item.internLocation = item.employmentProvince === item.employmentCity
      ? item.employmentProvince
      : item.employmentProvince + item.employmentCity;
  } else {
    for (const key of ['internCompany', 'internPosition', 'internSalary', 'internLocation', 'employmentProvince', 'employmentCity', 'sameInternCompany', 'sameInternPosition']) {
      item[key] = '';
    }
    item.companyCategory = PENDING;
  }
  if (!isEmploymentSuccessDestination(item.destination)) {
    item.gradSchool = '';
    item.gradMajor = '';
  }
}

export async function listTrackingConfigs({ includeInactive } = {}) {
  const pool = await getPool();
  const sql = includeInactive
    ? 'SELECT * FROM tracking_configs ORDER BY sort_order ASC, id ASC'
    : 'SELECT * FROM tracking_configs WHERE is_active = 1 ORDER BY sort_order ASC, id ASC';
  const [rows] = await pool.query(sql);
  return rows.map(rowToConfig);
}

/** 已有就业记录优先；新就业登记额外返回同届实习基本信息及对照单位/岗位。 */
export async function lookupStudentInfo({ configId, studentName, studentId }) {
  const cid = Number(configId);
  const name = str(studentName);
  const sid = str(studentId);
  if (!cid) throw new ValidationError('请选择跟踪项目');
  if (!name) throw new ValidationError('请填写姓名');
  if (!sid) throw new ValidationError('请填写学号');

  const pool = await getPool();
  const config = await trackingConfig(pool, cid, true);
  const [rows] = await pool.query(
    `${INFO_SELECT} WHERE s.config_id = ? AND s.student_id = ? LIMIT 1`,
    [cid, sid]
  );
  const record = rows.length ? rowToInfo(rows[0]) : null;
  if (config.type === '就业' && record && record.studentName !== name) {
    throw new ValidationError('姓名与就业记录不一致，请核对姓名和学号');
  }
  const source = await internshipSource(pool, config, record?.studentName || name, sid);
  if (record && source) Object.assign(record, basicInfo(record, source));
  return {
    found: Boolean(record),
    record,
    nameMismatch: Boolean(record && record.studentName !== name),
    prefill: !record && source ? basicInfo(source) : null,
    internship: internshipReference(source),
  };
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
  'employment_province', 'employment_city', 'same_intern_company', 'same_intern_position', 'company_category',
];

function infoValues(item) {
  return [
    item.configId, item.studentName, item.studentId, item.className, item.hometown,
    item.trainingDirection, item.gender, item.phone, item.destination, item.internCompany,
    item.internLocation, item.internContact, item.internContactPhone, item.businessLine,
    item.internPosition, item.internSalary, item.internStartDate, item.internEndDate,
    item.gradSchool, item.gradMajor, item.remark,
    item.employmentProvince, item.employmentCity, item.sameInternCompany, item.sameInternPosition, item.companyCategory,
  ];
}

/** 人工判定只保留在相关事实未变化时；学生更改去向、岗位或企业待遇后重新自动判定。 */
const ASSESS_COLS = ['job_category', 'sop_status', 'star_status', 'job_category_manual', 'star_status_manual'];

function assessValues(item, existing = null) {
  if (existing && item.configType === '实习') {
    return [existing.jobCategory, existing.sopStatus, existing.starStatus, Number(existing.jobCategoryManual), Number(existing.starStatusManual)];
  }
  const next = assessRecord(item);
  const sameDestination = existing && existing.destination === item.destination;
  const keepJob = Boolean(sameDestination && existing.jobCategoryManual && existing.internPosition === item.internPosition);
  const keepStar = Boolean(sameDestination && existing.starStatusManual
    && existing.internCompany === item.internCompany && existing.internSalary === item.internSalary
    && existing.companyCategory === item.companyCategory);
  const jobCategory = keepJob ? existing.jobCategory : next.jobCategory;
  return [
    jobCategory,
    deriveSopStatus(jobCategory),
    keepStar ? existing.starStatus : next.starStatus,
    Number(keepJob),
    Number(keepStar),
  ];
}

const INSERT_COLS = [...COLS, ...ASSESS_COLS];
const INSERT_PLACEHOLDERS = INSERT_COLS.map(() => '?').join(', ');

function insertValues(item, existing = null) {
  return [...infoValues(item), ...assessValues(item, existing)];
}

/** 就业基本信息以已有登记/同届实习为准；新手动登记和各去向字段均在服务端校验。 */
export async function upsertStudentInfo(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const cid = Number(raw.configId || 0);
  if (!cid) throw new ValidationError('请选择跟踪项目');
  if (!str(raw.studentName)) throw new ValidationError('姓名为必填项');
  if (!str(raw.studentId)) throw new ValidationError('学号为必填项');

  const pool = await getPool();
  const config = await trackingConfig(pool, cid, true);
  const item = normalizeInfo(raw, config.type);
  const [exist] = await pool.query(
    `${INFO_SELECT} WHERE s.config_id = ? AND s.student_id = ? LIMIT 1`,
    [cid, item.studentId]
  );
  const existing = exist.length ? rowToInfo(exist[0]) : null;

  if (config.type === '就业') {
    if (existing && existing.studentName !== item.studentName) {
      throw new ValidationError('姓名与就业记录不一致，请核对姓名和学号');
    }
    const source = await internshipSource(pool, config, item.studentName, item.studentId);
    const inherited = existing || source;
    if (inherited) {
      Object.assign(item, basicInfo(inherited, source));
    } else {
      for (const [field, label] of [
        ['className', '班级'], ['hometown', '籍贯'], ['trainingDirection', '实训方向'],
        ['gender', '性别'], ['phone', '手机号'],
      ]) {
        if (!item[field]) throw new ValidationError(`${label}为必填项`);
      }
    }
    const error = employmentFieldError(item);
    if (error) throw new ValidationError(error);
    // 企业分类只由教师维护；换单位后旧单位的分类不沿用。
    item.companyCategory = existing && existing.internCompany === item.internCompany
      ? existing.companyCategory : PENDING;
    item.remark = existing?.remark || '';
    clearInactiveEmploymentFields(item);
  } else {
    if (!item.className) throw new ValidationError('班级为必填项');
    if (!item.destination) throw new ValidationError('毕业后去向为必填项');
    item.companyCategory = existing?.companyCategory || PENDING;
  }

  const updates = INSERT_COLS
    .filter((column) => column !== 'config_id' && column !== 'student_id')
    .map((column) => `${column} = VALUES(${column})`)
    .join(', ');
  await pool.query(
    `INSERT INTO student_info (${INSERT_COLS.join(', ')}) VALUES (${INSERT_PLACEHOLDERS})
     ON DUPLICATE KEY UPDATE ${updates}`,
    insertValues(item, existing)
  );
  const [rows] = await pool.query(
    `${INFO_SELECT} WHERE s.config_id = ? AND s.student_id = ? LIMIT 1`,
    [cid, item.studentId]
  );
  return { record: rows.length ? rowToInfo(rows[0]) : null, created: !existing };
}

/** 教师修改企业分类、岗位类型或明星标记；SOP 始终随岗位类型派生，不作为独立输入。 */
export async function updateStudentAssessment(id, input) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) throw new ValidationError('无效的记录 ID');
  const source = input && typeof input === 'object' ? input : {};
  const pool = await getPool();
  const [rows] = await pool.query(`${INFO_SELECT} WHERE s.id = ? LIMIT 1`, [numId]);
  if (!rows.length) throw new ValidationError('记录不存在或已被删除');
  const current = rowToInfo(rows[0]);
  const fields = new Map();
  if (Object.hasOwn(source, 'companyCategory')) {
    const category = normalizeCompanyCategory(source.companyCategory);
    if (!COMPANY_CATEGORY_OPTIONS.includes(category)) throw new ValidationError('企业分类必须为Ⅰ、Ⅱ、Ⅲ、Ⅳ类或待判定');
    fields.set('company_category', category);
    if (!Object.hasOwn(source, 'starStatus') && !current.starStatusManual) {
      fields.set('star_status', assessRecord({ ...current, companyCategory: category }).starStatus);
    }
  }
  if (Object.hasOwn(source, 'jobCategory')) {
    const category = str(source.jobCategory);
    if (!JOB_CATEGORY_OPTIONS.includes(category)) throw new ValidationError('无效的岗位类型');
    fields.set('job_category', category);
    fields.set('sop_status', deriveSopStatus(category));
    fields.set('job_category_manual', Number(category !== PENDING));
  }
  for (const [key, column] of [['starStatus', 'star_status'], ['qualityStatus', 'quality_status']]) {
    if (!Object.hasOwn(source, key)) continue;
    const value = str(source[key]);
    if (![PENDING, '是', '否'].includes(value)) throw new ValidationError('判定结果必须为是、否或待判定');
    fields.set(column, value);
    if (key === 'starStatus') fields.set('star_status_manual', Number(value !== PENDING));
  }
  if (!fields.size) throw new ValidationError('没有需要更新的判定字段');
  await pool.query(
    `UPDATE student_info SET ${[...fields.keys()].map((column) => `${column} = ?`).join(', ')} WHERE id = ?`,
    [...fields.values(), numId]
  );
  const [updated] = await pool.query(`${INFO_SELECT} WHERE s.id = ? LIMIT 1`, [numId]);
  return updated.length ? rowToInfo(updated[0]) : null;
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
  await trackingConfig(pool, cid);
  const [rows] = await pool.query(`${INFO_SELECT} WHERE s.config_id = ?`, [cid]);

  let assessed = 0;
  let kept = 0;
  for (const row of rows) {
    const current = rowToInfo(row);
    const next = assessRecord(current);
    const replaceJob = overwrite || current.jobCategory === PENDING;
    const replaceStar = overwrite || current.starStatus === PENDING;
    const jobCategory = replaceJob ? next.jobCategory : current.jobCategory;
    const sopStatus = deriveSopStatus(jobCategory);
    const starStatus = replaceStar ? next.starStatus : current.starStatus;
    const jobManual = replaceJob ? 0 : Number(current.jobCategoryManual);
    const starManual = replaceStar ? 0 : Number(current.starStatusManual);
    if (jobCategory === current.jobCategory && sopStatus === current.sopStatus && starStatus === current.starStatus
      && jobManual === Number(current.jobCategoryManual) && starManual === Number(current.starStatusManual)) {
      kept += 1;
      continue;
    }
    await pool.query(
      'UPDATE student_info SET job_category = ?, sop_status = ?, star_status = ?, job_category_manual = ?, star_status_manual = ? WHERE id = ?',
      [jobCategory, sopStatus, starStatus, jobManual, starManual, current.id]
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
  let config;
  try {
    pool = await getPool();
    config = await trackingConfig(pool, cid);
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
    const item = normalizeInfo({ ...raw, configId: cid }, config.type);
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
    if (!COMPANY_CATEGORY_OPTIONS.includes(item.companyCategory)) {
      skipped += 1;
      issues.push({ ...(row ? { row } : {}), code: 'INVALID_COMPANY_CATEGORY', fields: ['companyCategory'], message: '企业分类必须为Ⅰ、Ⅱ、Ⅲ、Ⅳ类或待判定' });
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
