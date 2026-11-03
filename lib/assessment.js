/**
 * 判定规则（纯函数，无数据库依赖，供导入、自助填写与批量判定共用）
 *
 * 岗位分类（jobCategory）
 *   1. 实习岗位含 开发 / 测试 / 运维 / 技术支持 → SOP类IT岗位
 *   2. 实习岗位含 老师 / 教师 / 产品 / 运营 / 销售 / 售前 / 售后 / 提示词 / prompt / 标注 / AI训练师
 *      → 非SOP类IT岗位
 *   3. 去向含 考研 / 考公 / 公务员 / 研究生 / 升学 / 参军 → 升学、公职类
 *   4. IT企业的非IT岗位、其它岗位、自主创业 不自动判定，保持「待判定」交人工
 *
 * 是否SOP岗位（sopStatus）：跟随岗位分类，SOP类IT岗位→是，非SOP类IT岗位→否，其余待判定。
 *
 * 实习明星（starStatus）：实习单位名称含 讯飞 / 聆智 / 百得 / 科讯，或实习月薪 ≥ 5000 → 是，否则否。
 */
import { analyzeSalary } from './intern-fields';

export const PENDING = '待判定';

export const SOP_KEYWORDS = ['开发', '测试', '运维', '技术支持'];
export const NON_SOP_KEYWORDS = [
  '老师', '教师', '产品', '运营', '销售', '售前', '售后',
  '提示词', 'prompt', 'promot', '标注', 'AI训练师',
];
export const PUBLIC_KEYWORDS = ['考研', '考公', '公务员', '研究生', '升学', '参军'];
export const STAR_COMPANIES = ['讯飞', '聆智', '百得', '科讯'];
export const STAR_SALARY_FLOOR = 5000;

const CATEGORY_SOP = 'SOP类IT岗位';
const CATEGORY_NON_SOP = '非SOP类IT岗位';
const CATEGORY_PUBLIC = '升学、公职类';

function contains(text, keywords) {
  const value = String(text == null ? '' : text).toLowerCase();
  if (!value) return false;
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}

/** 岗位分类：去向优先，其次实习岗位；无法判定时返回「待判定」。 */
export function classifyJobCategory(record) {
  const item = record || {};
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

/** 实习明星：目标企业或月薪达到门槛即为「是」。 */
export function judgeStarStatus(record) {
  const item = record || {};
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
export function describeRules() {
  return [
    `岗位分类：实习岗位含「${SOP_KEYWORDS.join('、')}」→ ${CATEGORY_SOP}`,
    `岗位分类：实习岗位含「${NON_SOP_KEYWORDS.join('、')}」→ ${CATEGORY_NON_SOP}`,
    `岗位分类：去向含「${PUBLIC_KEYWORDS.join('、')}」→ ${CATEGORY_PUBLIC}`,
    'IT企业的非IT岗位、其它岗位、自主创业不自动判定，保持「待判定」由人工填',
    '是否 SOP 岗位跟随岗位分类：SOP类IT岗位→是，非SOP类IT岗位→否，其余待判定',
    `实习明星：实习单位含「${STAR_COMPANIES.join('、')}」或实习月薪 ≥ ${STAR_SALARY_FLOOR} → 是`,
  ];
}
