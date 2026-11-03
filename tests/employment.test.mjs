import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessRecord,
  classifyJobCategory,
  judgeStarStatus,
} from '../lib/assessment.js';
import {
  canonicalEmploymentDestination,
  employmentFieldError,
  isEmploymentCompanyDestination,
  isEmploymentSuccessDestination,
  normalizeCompanyCategory,
} from '../lib/employment-fields.js';

function realJob(overrides = {}) {
  return {
    destination: '就业上岗',
    internCompany: '某科技公司',
    internPosition: 'Java开发',
    internSalary: '8000',
    employmentProvince: '江苏省',
    employmentCity: '南京市',
    sameInternCompany: '是',
    sameInternPosition: '否',
    ...overrides,
  };
}

function otherJob(overrides = {}) {
  return {
    destination: '其他就业',
    internCompany: '协议单位',
    internPosition: '实施工程师',
    ...overrides,
  };
}

function employment(overrides = {}) {
  return { configType: '就业', ...overrides };
}

test('就业去向取值与旧实习标签、说明文案可归一，未知原文保留', () => {
  assert.equal(canonicalEmploymentDestination(' 就业上岗（真实就业） '), '就业上岗');
  assert.equal(canonicalEmploymentDestination('其他就业(学生自行提供就业协议，不包含二战)'), '其他就业');
  assert.equal(canonicalEmploymentDestination('离职、待就业'), '离职/待就业');
  assert.equal(canonicalEmploymentDestination('升学考公成功'), '升学、考公成功');
  assert.equal(canonicalEmploymentDestination('已找到实习单位'), '就业上岗');
  assert.equal(canonicalEmploymentDestination('实习就业'), '就业上岗');
  assert.equal(canonicalEmploymentDestination('备考研究生'), '二战升学、考公');
  assert.equal(canonicalEmploymentDestination('备考公务员'), '二战升学、考公');
  assert.equal(canonicalEmploymentDestination('待实习'), '离职/待就业');
  assert.equal(canonicalEmploymentDestination('???'), '???');
  assert.equal(isEmploymentCompanyDestination('就业'), true);
  assert.equal(isEmploymentCompanyDestination('参军'), false);
  assert.equal(isEmploymentSuccessDestination('升学考公成功'), true);
  assert.equal(isEmploymentSuccessDestination('二战升学、考公'), false);
});

test('企业分类空值待判定，罗马数字归一，未知值原样保留', () => {
  assert.equal(normalizeCompanyCategory(''), '待判定');
  assert.equal(normalizeCompanyCategory('  '), '待判定');
  assert.equal(normalizeCompanyCategory('I 类'), 'Ⅰ类');
  assert.equal(normalizeCompanyCategory('ii类'), 'Ⅱ类');
  assert.equal(normalizeCompanyCategory('Ⅲ 类'), 'Ⅲ类');
  assert.equal(normalizeCompanyCategory('IV'), 'Ⅳ类');
  assert.equal(normalizeCompanyCategory('四类'), 'Ⅳ类');
  assert.equal(normalizeCompanyCategory('V类'), 'V类');
});

test('就业上岗七项必填，其他就业仅单位岗位必填', () => {
  assert.equal(employmentFieldError(realJob()), '');
  assert.equal(employmentFieldError(realJob({ internCompany: '' })), '单位名称为必填项');
  assert.equal(employmentFieldError(realJob({ internPosition: '' })), '岗位名称为必填项');
  assert.equal(employmentFieldError(realJob({ internSalary: '' })), '岗位薪资为必填项');
  assert.equal(employmentFieldError(realJob({ employmentProvince: '' })), '单位省份为必填项');
  assert.equal(employmentFieldError(realJob({ employmentCity: '' })), '单位城市为必填项');
  assert.equal(employmentFieldError(realJob({ sameInternCompany: '' })), '与实习单位是否一致为必填项');
  assert.equal(employmentFieldError(realJob({ sameInternPosition: '' })), '与实习岗位是否一致为必填项');
  assert.equal(employmentFieldError(otherJob()), '');
  assert.equal(employmentFieldError(otherJob({ internCompany: '' })), '单位名称为必填项');
  assert.equal(employmentFieldError(otherJob({ internPosition: '' })), '岗位名称为必填项');
  assert.equal(employmentFieldError(otherJob({ internSalary: '', employmentProvince: '浙江省' })), '');
});

test('省市对应与是否选项校验，可选字段有值才检查', () => {
  assert.equal(employmentFieldError(realJob({ employmentProvince: '北京市', employmentCity: '北京市' })), '');
  assert.equal(employmentFieldError(realJob({ employmentProvince: '江苏', employmentCity: '南京市' })), '单位省份无效');
  assert.equal(employmentFieldError(realJob({ employmentProvince: '江苏省', employmentCity: '杭州市' })), '单位城市与省份不匹配');
  assert.equal(employmentFieldError(otherJob({ employmentCity: '南京市' })), '单位城市与省份不匹配');
  assert.equal(employmentFieldError(otherJob({ employmentProvince: '浙江省' })), '');
  assert.equal(employmentFieldError(otherJob({ employmentProvince: '浙江省', employmentCity: '杭州市' })), '');
  assert.equal(employmentFieldError(realJob({ internSalary: 'abc' })), '岗位薪资无法识别');
  assert.equal(employmentFieldError(realJob({ internSalary: '-8000' })), '岗位薪资无法识别');
  assert.equal(employmentFieldError(realJob({ internSalary: '300/天' })), '');
  assert.equal(employmentFieldError(otherJob({ internSalary: '无法识别薪资' })), '岗位薪资无法识别');
  assert.equal(employmentFieldError(realJob({ sameInternCompany: '真' })), '与实习单位是否一致只能填是或否');
  assert.equal(employmentFieldError(otherJob({ sameInternPosition: 'yes' })), '与实习岗位是否一致只能填是或否');
  assert.equal(employmentFieldError(otherJob({ sameInternCompany: '否', sameInternPosition: '是' })), '');
});

test('升学成功只校验院校专业；非在职去向忽略过期 intern 字段', () => {
  assert.equal(employmentFieldError({ destination: '' }), '去向为必填项');
  assert.equal(employmentFieldError({ destination: '未定义去向' }), '去向选项无效');
  assert.equal(employmentFieldError({ destination: '升学、考公成功' }), '上岸单位/院校为必填项');
  assert.equal(employmentFieldError({ destination: '升学、考公成功', gradSchool: '吉林大学' }), '岗位/专业为必填项');
  assert.equal(employmentFieldError({ destination: '升学、考公成功', gradSchool: '吉林大学', gradMajor: '计算机' }), '');
  assert.equal(employmentFieldError({
    destination: '升学、考公成功',
    gradSchool: '吉林大学',
    gradMajor: '计算机',
    internCompany: '',
    internSalary: 'abc',
    sameInternCompany: '真',
  }), '');
  for (const destination of ['二战升学、考公', '离职/待就业', '参军', '自主创业']) {
    assert.equal(employmentFieldError({
      destination,
      internCompany: '',
      internPosition: 'Java开发',
      internSalary: '不是薪资',
      employmentCity: '南京市',
      sameInternCompany: '真',
      gradSchool: '',
    }), '');
  }
});


test('实习判定保持原关键词、四家企业和 5000 门槛', () => {
  assert.deepEqual(assessRecord({ internPosition: 'Java开发' }), {
    jobCategory: 'SOP类IT岗位', sopStatus: '是', starStatus: '否',
  });
  assert.equal(classifyJobCategory({ internPosition: '算法应用' }), '待判定');
  assert.equal(classifyJobCategory({ internPosition: '提示工程师' }), '待判定');
  assert.equal(classifyJobCategory({ internPosition: '内容审核' }), '待判定');
  assert.equal(classifyJobCategory({ destination: '参军' }), '升学、公职类');
  assert.equal(classifyJobCategory({ destination: '备考研究生' }), '升学、公职类');
  assert.equal(judgeStarStatus({ internCompany: '科大讯飞', internSalary: '1' }), '是');
  assert.equal(judgeStarStatus({ internCompany: '亚信科技', internSalary: '4999' }), '否');
  assert.equal(judgeStarStatus({ internCompany: '普通公司', internSalary: '4999' }), '否');
  assert.equal(judgeStarStatus({ internCompany: '普通公司', internSalary: '5000' }), '是');
  assert.equal(judgeStarStatus({ internSalary: '4999', companyCategory: 'Ⅰ类' }), '否');
});

test('就业岗位关键词仅作用于在职去向，算法提示内容可判定', () => {
  assert.deepEqual(assessRecord(employment({
    destination: '就业上岗', internPosition: '算法应用', internCompany: '普通公司', internSalary: '1000',
  })), { jobCategory: 'SOP类IT岗位', sopStatus: '是', starStatus: '否' });
  assert.deepEqual(assessRecord(employment({
    destination: '其他就业', internPosition: '提示工程师', internCompany: '普通公司', internSalary: '1000',
  })), { jobCategory: '非SOP类IT岗位', sopStatus: '否', starStatus: '否' });
  assert.equal(classifyJobCategory(employment({ destination: '就业上岗', internPosition: '内容审核' })), '非SOP类IT岗位');
  assert.equal(classifyJobCategory(employment({ destination: '就业上岗', internPosition: '' })), '待判定');
  assert.equal(classifyJobCategory(employment({ destination: '就业上岗', internPosition: 'Java开发老师' })), 'SOP类IT岗位');
});

test('就业成功归升学公职类，二战待就业参军即使残留岗位也不分类', () => {
  assert.deepEqual(assessRecord(employment({
    destination: '升学、考公成功',
    internPosition: 'Java开发',
    internCompany: '讯飞',
    internSalary: '20000',
    companyCategory: 'Ⅰ类',
  })), { jobCategory: '升学、公职类', sopStatus: '待判定', starStatus: '否' });
  assert.deepEqual(assessRecord(employment({
    destination: '自主创业',
    internPosition: 'Java开发',
    internCompany: '讯飞',
    internSalary: '20000',
    companyCategory: 'Ⅰ类',
  })), { jobCategory: '自主创业', sopStatus: '待判定', starStatus: '否' });
  for (const destination of ['二战升学、考公', '离职/待就业', '参军']) {
    assert.deepEqual(assessRecord(employment({
      destination,
      internPosition: 'Java开发',
      internCompany: '讯飞',
      internSalary: '20000',
      companyCategory: 'Ⅰ类',
    })), { jobCategory: '待判定', sopStatus: '待判定', starStatus: '否' });
  }
});

test('就业明星 7999/8000 与 I/II、III/IV，不猜测未点名企业', () => {
  const base = employment({
    destination: '就业上岗',
    internPosition: 'Java开发',
    internCompany: '普通公司',
    companyCategory: 'Ⅳ类',
  });
  assert.equal(judgeStarStatus({ ...base, internSalary: '7999' }), '否');
  assert.equal(judgeStarStatus({ ...base, internSalary: '8000' }), '是');
  assert.equal(judgeStarStatus({ ...base, internSalary: '1000', companyCategory: 'Ⅰ类' }), '是');
  assert.equal(judgeStarStatus({ ...base, internSalary: '1000', companyCategory: 'II类' }), '是');
  assert.equal(judgeStarStatus({ ...base, internSalary: '1000', companyCategory: 'Ⅲ类' }), '否');
  assert.equal(judgeStarStatus({ ...base, internSalary: '1000', companyCategory: 'Ⅳ类' }), '否');
  assert.equal(judgeStarStatus({ ...base, internSalary: '1000', internCompany: '亚信科技' }), '是');
  assert.equal(judgeStarStatus({ ...base, internSalary: '1000', internCompany: '用友网络' }), '是');
  assert.equal(judgeStarStatus({ ...base, internSalary: '1000', internCompany: '泛微' }), '是');
  assert.equal(judgeStarStatus({ ...base, internSalary: '1000', internCompany: '华为技术有限公司' }), '否');
});
