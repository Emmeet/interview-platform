/**
 * 判定规则（纯函数，无数据库依赖，供导入、自助填写与批量判定共用）
 *
 * 实习岗位分类（jobCategory）
 *   1. 实习岗位含 开发 / 测试 / 运维 / 技术支持 → SOP类IT岗位
 *   2. 实习岗位含 老师 / 教师 / 产品 / 运营 / 销售 / 售前 / 售后 / 提示词 / prompt / 标注 / AI训练师
 *      → 非SOP类IT岗位
 *   3. 去向含 考研 / 考公 / 公务员 / 研究生 / 升学 / 参军 → 升学、公职类
 *   4. IT企业的非IT岗位、其它岗位、自主创业 不自动判定，保持「待判定」交人工
 *
 * 就业岗位分类按去向分流：仅就业上岗/其他就业按岗位关键词判定（SOP 增补算法应用，
 * 非 SOP 增补提示工程师/内容审核）；自主创业、升学考公成功直接归类；二战/待就业/参军待判定。
 *
 * 是否SOP岗位（sopStatus）：跟随岗位分类，SOP类IT岗位→是，非SOP类IT岗位→否，其余待判定。
 *
 * 实习明星：实习单位名称含 讯飞 / 聆智 / 百得 / 科讯，或实习月薪 ≥ 5000 → 是，否则否。
 * 就业明星：仅就业上岗/其他就业；单位含讯飞/聆智/百得/科讯/亚信/用友/泛微，或企业分类Ⅰ/Ⅱ类，或月薪 ≥ 8000。
 */
import {
  canonicalEmploymentDestination,
  isEmploymentCompanyDestination,
  isEmploymentSuccessDestination,
  normalizeCompanyCategory,
} from './employment-fields.js';
import { analyzeSalary } from './intern-fields.js';

export const PENDING = '待判定';

export const SOP_KEYWORDS = ['开发', '测试', '运维', '技术支持'];
export const NON_SOP_KEYWORDS = [
  '老师', '教师', '产品', '运营', '销售', '售前', '售后',
  '提示词', 'prompt', 'promot', '标注', 'AI训练师',
];
export const PUBLIC_KEYWORDS = ['考研', '考公', '公务员', '研究生', '升学', '参军'];
export const STAR_COMPANIES = ['讯飞', '聆智', '百得', '科讯'];
export const STAR_SALARY_FLOOR = 5000;

const EMPLOYMENT_SOP_KEYWORDS = [...SOP_KEYWORDS, '算法应用'];
const EMPLOYMENT_NON_SOP_KEYWORDS = [...NON_SOP_KEYWORDS, '提示工程师', '内容审核'];
const EMPLOYMENT_STAR_COMPANIES = [...STAR_COMPANIES, '亚信', '用友', '泛微'];
const EMPLOYMENT_STAR_SALARY_FLOOR = 8000;
const STAR_COMPANY_CATEGORIES = new Set(['Ⅰ类', 'Ⅱ类']);

const CATEGORY_SOP = 'SOP类IT岗位';
const CATEGORY_NON_SOP = '非SOP类IT岗位';
const CATEGORY_PUBLIC = '升学、公职类';
const CATEGORY_STARTUP = '自主创业';

export const JOB_CATEGORY_OPTIONS = [
  PENDING, CATEGORY_SOP, CATEGORY_NON_SOP, 'IT企业的非IT岗位', '其它岗位', CATEGORY_STARTUP, CATEGORY_PUBLIC,
];

function contains(text, keywords) {
  const value = String(text == null ? '' : text).toLowerCase();
  if (!value) return false;
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}

function isEmploymentRecord(record) {
  return String(record && record.configType ? record.configType : '').trim() === '就业';
}

function classifyEmploymentJobCategory(item) {
  const dest = canonicalEmploymentDestination(item.destination);
  if (dest === CATEGORY_STARTUP) return CATEGORY_STARTUP;
  if (isEmploymentSuccessDestination(dest)) return CATEGORY_PUBLIC;
  if (!isEmploymentCompanyDestination(dest)) return PENDING;
  if (contains(item.internPosition, EMPLOYMENT_SOP_KEYWORDS)) return CATEGORY_SOP;
  if (contains(item.internPosition, EMPLOYMENT_NON_SOP_KEYWORDS)) return CATEGORY_NON_SOP;
  return PENDING;
}

/** 岗位分类：去向优先，其次实习岗位；无法判定时返回「待判定」。 */
export function classifyJobCategory(record) {
  const item = record || {};
  if (isEmploymentRecord(item)) return classifyEmploymentJobCategory(item);
  if (contains(item.destination, PUBLIC_KEYWORDS)) return CATEGORY_PUBLIC;
  if (contains(item.internPosition, SOP_KEYWORDS)) return CATEGORY_SOP;
  if (contains(item.internPosition, NON_SOP_KEYWORDS)) return CATEGORY_NON_SOP;
  return PENDING;
}

/** 是否 SOP 岗位：跟随岗位分类。 */
export function deriveSopStatus(jobCategory) {
  if (jobCategory === CATEGORY_SOP) return '是';
  if (jobCategory === CATEGORY_NON_SOP) return '否';
  return PENDING;
}

function judgeEmploymentStarStatus(item) {
  if (!isEmploymentCompanyDestination(item.destination)) return '否';
  if (contains(item.internCompany, EMPLOYMENT_STAR_COMPANIES)) return '是';
  if (STAR_COMPANY_CATEGORIES.has(normalizeCompanyCategory(item.companyCategory))) return '是';
  const monthly = analyzeSalary(item.internSalary).monthly;
  return monthly != null && monthly >= EMPLOYMENT_STAR_SALARY_FLOOR ? '是' : '否';
}

/** 实习明星：目标企业或月薪达到门槛即为「是」。 */
export function judgeStarStatus(record) {
  const item = record || {};
  if (isEmploymentRecord(item)) return judgeEmploymentStarStatus(item);
  if (contains(item.internCompany, STAR_COMPANIES)) return '是';
  const monthly = analyzeSalary(item.internSalary).monthly;
  return monthly != null && monthly >= STAR_SALARY_FLOOR ? '是' : '否';
}

/** 一次性给出三个判定字段。 */
export function assessRecord(record) {
  const jobCategory = classifyJobCategory(record);
  return {
    jobCategory,
    sopStatus: deriveSopStatus(jobCategory),
    starStatus: judgeStarStatus(record),
  };
}

/** 判定规则说明，用于界面提示。 */
export function describeRules(configType = '实习') {
  if (String(configType || '').trim() === '就业') {
    return [
      `岗位分类：就业上岗、其他就业岗位含「${EMPLOYMENT_SOP_KEYWORDS.join('、')}」→ ${CATEGORY_SOP}`,
      `岗位分类：就业上岗、其他就业岗位含「${EMPLOYMENT_NON_SOP_KEYWORDS.join('、')}」→ ${CATEGORY_NON_SOP}`,
      `岗位分类：去向为自主创业 → ${CATEGORY_STARTUP}`,
      `岗位分类：去向为升学、考公成功 → ${CATEGORY_PUBLIC}`,
      '岗位分类：二战升学、考公、离职/待就业、参军保持「待判定」，不按岗位或去向关键词判定',
      'IT企业的非IT岗位、其它岗位不自动判定，保持「待判定」由人工填',
      '是否 SOP 岗位跟随岗位分类：SOP类IT岗位→是，非SOP类IT岗位→否，其余待判定',
      `明星就业：就业单位含「${EMPLOYMENT_STAR_COMPANIES.join('、')}」或企业分类为Ⅰ类/Ⅱ类或就业月薪 ≥ ${EMPLOYMENT_STAR_SALARY_FLOOR} → 是`,
    ];
  }
  return [
    `岗位分类：实习岗位含「${SOP_KEYWORDS.join('、')}」→ ${CATEGORY_SOP}`,
    `岗位分类：实习岗位含「${NON_SOP_KEYWORDS.join('、')}」→ ${CATEGORY_NON_SOP}`,
    `岗位分类：去向含「${PUBLIC_KEYWORDS.join('、')}」→ ${CATEGORY_PUBLIC}`,
    'IT企业的非IT岗位、其它岗位、自主创业不自动判定，保持「待判定」由人工填',
    '是否 SOP 岗位跟随岗位分类：SOP类IT岗位→是，非SOP类IT岗位→否，其余待判定',
    `实习明星：实习单位含「${STAR_COMPANIES.join('、')}」或实习月薪 ≥ ${STAR_SALARY_FLOOR} → 是`,
  ];
}
