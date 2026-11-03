import { INTERN_DEST_LABEL, analyzeSalary, isInternDestination } from './intern-fields.js';
import { PROVINCE_CITY } from './region-data.js';

export const EMPLOYMENT_DESTINATIONS = [
  { value: '二战升学、考公', label: '二战升学、考公' },
  { value: '就业上岗', label: '就业上岗（真实就业）' },
  { value: '升学、考公成功', label: '升学、考公成功' },
  { value: '其他就业', label: '其他就业（学生自行提供就业协议，不包含二战）' },
  { value: '离职/待就业', label: '离职/待就业（不包含二战考研、考公）' },
];

export const EMPLOYMENT_SERVICE_DESTINATIONS = [
  { value: '参军', label: '参军' },
  { value: '自主创业', label: '自主创业' },
];

export const COMPANY_CATEGORY_OPTIONS = ['待判定', 'Ⅰ类', 'Ⅱ类', 'Ⅲ类', 'Ⅳ类'];

const EMPLOYMENT_DEST_VALUES = [
  ...EMPLOYMENT_DESTINATIONS.map((item) => item.value),
  ...EMPLOYMENT_SERVICE_DESTINATIONS.map((item) => item.value),
];
const EMPLOYMENT_DEST_SET = new Set(EMPLOYMENT_DEST_VALUES);

const YES_NO = new Set(['是', '否']);
const REAL_JOB = '就业上岗';
const OTHER_JOB = '其他就业';
const SUCCESS_DEST = '升学、考公成功';

function destKey(raw) {
  return String(raw ?? '')
    .replace(/（[^）]*）|\([^)]*\)/g, '')
    .replace(/[、，,/\s]/g, '');
}

const EMPLOYMENT_DEST_BY_KEY = new Map();
for (const value of EMPLOYMENT_DEST_VALUES) {
  EMPLOYMENT_DEST_BY_KEY.set(destKey(value), value);
}
for (const alias of ['实习', '就业', '实习就业', INTERN_DEST_LABEL, '真实就业']) {
  EMPLOYMENT_DEST_BY_KEY.set(destKey(alias), REAL_JOB);
}
for (const alias of ['备考研究生', '备考公务员', '考研', '考公']) {
  EMPLOYMENT_DEST_BY_KEY.set(destKey(alias), '二战升学、考公');
}
for (const alias of ['待实习', '待就业', '离职']) {
  EMPLOYMENT_DEST_BY_KEY.set(destKey(alias), '离职/待就业');
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

export function canonicalEmploymentDestination(raw) {
  const original = text(raw);
  if (!original) return '';
  if (EMPLOYMENT_DEST_SET.has(original)) return original;
  const key = destKey(original);
  if (EMPLOYMENT_DEST_BY_KEY.has(key)) return EMPLOYMENT_DEST_BY_KEY.get(key);
  if (isInternDestination(original)) return REAL_JOB;
  return original;
}

export function isEmploymentCompanyDestination(raw) {
  const dest = canonicalEmploymentDestination(raw);
  return dest === REAL_JOB || dest === OTHER_JOB;
}

export function isEmploymentSuccessDestination(raw) {
  return canonicalEmploymentDestination(raw) === SUCCESS_DEST;
}

function categoryKey(raw) {
  return text(raw).replace(/\s+/g, '').replace(/类$/u, '').toUpperCase();
}

const COMPANY_CATEGORY_BY_KEY = new Map([
  ['待判定', '待判定'],
  ['Ⅰ', 'Ⅰ类'],
  ['I', 'Ⅰ类'],
  ['1', 'Ⅰ类'],
  ['一', 'Ⅰ类'],
  ['Ⅱ', 'Ⅱ类'],
  ['II', 'Ⅱ类'],
  ['2', 'Ⅱ类'],
  ['二', 'Ⅱ类'],
  ['Ⅲ', 'Ⅲ类'],
  ['III', 'Ⅲ类'],
  ['3', 'Ⅲ类'],
  ['三', 'Ⅲ类'],
  ['Ⅳ', 'Ⅳ类'],
  ['IV', 'Ⅳ类'],
  ['4', 'Ⅳ类'],
  ['四', 'Ⅳ类'],
]);

export function normalizeCompanyCategory(raw) {
  const original = text(raw);
  if (!original) return '待判定';
  const key = categoryKey(original);
  if (COMPANY_CATEGORY_BY_KEY.has(key)) return COMPANY_CATEGORY_BY_KEY.get(key);
  return original;
}

function salaryError(raw, required) {
  const original = text(raw);
  if (!original) return required ? '岗位薪资为必填项' : '';
  const monthly = analyzeSalary(original).monthly;
  if (/^\s*-\s*\d/.test(original) || /(?:日薪|每天|日工资)\s*[:：]?\s*-\s*\d/.test(original)
    || monthly == null || monthly < 0) return '岗位薪资无法识别';
  return '';
}

function flagError(raw, required, label) {
  const value = text(raw);
  if (!value) return required ? `${label}为必填项` : '';
  if (!YES_NO.has(value)) return `${label}只能填是或否`;
  return '';
}

function provinceCityError(province, city, required) {
  const p = text(province);
  const c = text(city);
  if (required) {
    if (!p) return '单位省份为必填项';
    if (!PROVINCE_CITY[p]) return '单位省份无效';
    if (!c) return '单位城市为必填项';
    if (!PROVINCE_CITY[p].includes(c)) return '单位城市与省份不匹配';
    return '';
  }
  if (!p && !c) return '';
  if (!p) return '单位城市与省份不匹配';
  if (!PROVINCE_CITY[p]) return '单位省份无效';
  if (!c) return '';
  if (!PROVINCE_CITY[p].includes(c)) return '单位城市与省份不匹配';
  return '';
}

export function employmentFieldError(record) {
  const item = record && typeof record === 'object' ? record : {};
  const dest = canonicalEmploymentDestination(item.destination);
  if (!dest) return '去向为必填项';
  if (!EMPLOYMENT_DEST_SET.has(dest)) return '去向选项无效';

  if (dest === SUCCESS_DEST) {
    if (!text(item.gradSchool)) return '上岸单位/院校为必填项';
    if (!text(item.gradMajor)) return '岗位/专业为必填项';
    return '';
  }

  if (dest !== REAL_JOB && dest !== OTHER_JOB) return '';

  if (!text(item.internCompany)) return '单位名称为必填项';
  if (!text(item.internPosition)) return '岗位名称为必填项';

  const real = dest === REAL_JOB;
  const salary = salaryError(item.internSalary, real);
  if (salary) return salary;
  const place = provinceCityError(item.employmentProvince, item.employmentCity, real);
  if (place) return place;
  const sameCompany = flagError(item.sameInternCompany, real, '与实习单位是否一致');
  if (sameCompany) return sameCompany;
  return flagError(item.sameInternPosition, real, '与实习岗位是否一致');
}
