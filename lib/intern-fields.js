import { MUNICIPALITIES, PROVINCE_CITY } from './region-data.js';

export const INTERN_DEST_LABEL = '已找到实习单位';

const INTERN_DESTS = new Set(['实习', '就业', '实习就业', INTERN_DEST_LABEL]);

export const TRAINING_OPTIONS = ['前端开发-刘伟', '前端开发-刘杨', '后端开发-王荣丽'];


export const SALARY_BUCKETS = ['2000以下', '2000-2999', '3000-3999', '4000-5999', '6000-7999', '8000及以上'];

const WORKDAYS = 22;

export function isInternDestination(dest) {
  return INTERN_DESTS.has(String(dest || '').trim());
}

export function canonicalDestination(dest) {
  const value = String(dest || '').trim();
  if (!value) return '';
  if (isInternDestination(value)) return INTERN_DEST_LABEL;
  return value;
}


function money(n) {
  const rounded = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(rounded)) return 0;
  return Number.isInteger(rounded) ? rounded : rounded;
}

function formatMoney(n) {
  const value = money(n);
  return Number.isInteger(value) ? String(value) : String(value);
}

export function analyzeSalary(raw) {
  const original = String(raw ?? '').trim();
  if (!original) return { monthly: null, display: '' };

  const compact = original.replace(/,/g, '').replace(/\s+/g, '');
  const wrapped = compact.match(/^(\d+(?:\.\d+)?)[（(]/);
  if (wrapped) {
    return { monthly: money(wrapped[1]), display: original };
  }

  const daily = compact.match(/(\d+(?:\.\d+)?)(?:元)?(?:\/|／)(?:天|日)/)
    || compact.match(/(?:日薪|每天|日工资)[:：]?(\d+(?:\.\d+)?)/);
  if (daily) {
    const day = money(daily[1]);
    const rest = compact.replace(daily[0], ' ');
    const multiplier = /[×xX*]22/.test(compact);
    const extras = (rest.match(/\d+(?:\.\d+)?/g) || [])
      .map((n) => money(n))
      .filter((n) => !(multiplier && n === WORKDAYS));
    const extra = extras.reduce((sum, n) => sum + n, 0);
    const monthly = money(day * WORKDAYS + extra);
    const display = extra
      ? `${formatMoney(monthly)}（${formatMoney(day)}/天×${WORKDAYS}+${formatMoney(extra)}）`
      : `${formatMoney(monthly)}（${formatMoney(day)}/天×${WORKDAYS}）`;
    return { monthly, display };
  }

  const nums = (compact.match(/\d+(?:\.\d+)?/g) || []).map((n) => money(n));
  if (!nums.length) return { monthly: null, display: original };
  return { monthly: money(nums[0]), display: original };
}

export function salaryDisplay(raw) {
  return analyzeSalary(raw).display;
}

export function salaryBucket(monthly) {
  if (monthly == null || !Number.isFinite(monthly)) return '无法识别';
  if (monthly < 2000) return '2000以下';
  if (monthly < 3000) return '2000-2999';
  if (monthly < 4000) return '3000-3999';
  if (monthly < 6000) return '4000-5999';
  if (monthly < 8000) return '6000-7999';
  return '8000及以上';
}

function provinceShort(name) {
  return name.replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省/g, '');
}

function cityShort(name) {
  return name.replace(/(市|自治州|地区|盟)$/u, '');
}

const PLACE_ALIASES = [];
for (const [province, cities] of Object.entries(PROVINCE_CITY)) {
  PLACE_ALIASES.push({ text: province, label: province, kind: 'province' });
  const shortProvince = provinceShort(province);
  if (shortProvince && shortProvince !== province) {
    PLACE_ALIASES.push({ text: shortProvince, label: province, kind: 'province', rejectNext: '市' });
  }
  for (const city of cities) {
    PLACE_ALIASES.push({ text: city, label: city, kind: 'city' });
    const shortCity = cityShort(city);
    if (shortCity && shortCity !== city && shortCity.length >= 2) {
      PLACE_ALIASES.push({ text: shortCity, label: city, kind: 'city', rejectNext: '省' });
    }
  }
}
PLACE_ALIASES.sort((a, b) => b.text.length - a.text.length);

export function parseHometown(raw) {
  const text = String(raw || '').replace(/\s+/g, '');
  if (!text) return { province: '', city: '' };

  const provinces = Object.keys(PROVINCE_CITY);
  let province = '';
  let provinceLen = 0;
  for (const name of provinces) {
    const short = provinceShort(name);
    const aliases = short && short !== name ? [name, short] : [name];
    for (const alias of aliases) {
      const index = text.indexOf(alias);
      if (index < 0) continue;
      const next = text.charAt(index + alias.length);
      if (alias !== name && next === '市') continue;
      if (alias.length > provinceLen) {
        province = name;
        provinceLen = alias.length;
      }
    }
  }

  let city = '';
  let cityLen = 0;
  let cityAt = -1;
  for (const [name, cities] of Object.entries(PROVINCE_CITY)) {
    for (const full of cities) {
      const short = cityShort(full);
      const aliases = short && short !== full && short.length >= 2 ? [full, short] : [full];
      for (const alias of aliases) {
        const index = text.indexOf(alias);
        if (index < 0) continue;
        const next = text.charAt(index + alias.length);
        if (alias !== full && next === '省') continue;
        const better = alias.length > cityLen || (alias.length === cityLen && index > cityAt);
        if (!better) continue;
        city = full;
        cityLen = alias.length;
        cityAt = index;
        province = name;
      }
    }
  }

  if (city && cityAt >= 0) {
    const after = text.slice(cityAt + cityLen);
    const short = provinceShort(province);
    if (after && short && text.startsWith(short) && !['省', '市', '区', '县'].includes(after)) {
      city = after;
    }
  }

  if (province && !city) {
    const short = provinceShort(province);
    let rest = text;
    if (rest.startsWith(province)) rest = rest.slice(province.length);
    else if (short && rest.startsWith(short)) rest = rest.slice(short.length);
    if (rest) city = rest;
  }
  if (MUNICIPALITIES.includes(province)) city = province;
  return { province, city };
}

export function inferWorkPlace(raw) {
  const text = String(raw || '').replace(/\s+/g, '');
  if (!text) return '';
  let best = null;
  for (const alias of PLACE_ALIASES) {
    const index = text.indexOf(alias.text);
    if (index < 0) continue;
    const next = text.charAt(index + alias.text.length);
    if (alias.rejectNext && next === alias.rejectNext) continue;
    const candidate = { index, length: alias.text.length, kind: alias.kind, label: alias.label };
    if (!best) {
      best = candidate;
      continue;
    }
    const cityWins = candidate.kind === 'city' && best.kind !== 'city';
    const sameKindBetter = candidate.kind === best.kind && (
      candidate.length > best.length || (candidate.length === best.length && candidate.index < best.index)
    );
    if (cityWins || sameKindBetter) best = candidate;
  }
  return best ? best.label : '未识别地点';
}

export function topWorkPlaces(counts, limit = 10) {
  const unknown = counts['未识别地点'] || 0;
  const entries = Object.entries(counts)
    .filter(([label, count]) => label !== '未识别地点' && count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
  const labels = entries.slice(0, limit).map(([label]) => label);
  const data = entries.slice(0, limit).map(([, count]) => count);
  const overflow = entries.slice(limit).reduce((sum, [, count]) => sum + count, 0);
  if (overflow) {
    labels.push('其他');
    data.push(overflow);
  }
  if (unknown) {
    labels.push('未识别地点');
    data.push(unknown);
  }
  return { labels, data };
}

function normHeader(value) {
  return String(value ?? '').replace(/\s+/g, '').replace(/（[^）]*）|\([^)]*\)/g, '');
}

const SHEET_FIELDS = [
  ['studentName', ['姓名']],
  ['className', ['班级']],
  ['studentId', ['学号']],
  ['hometown', ['籍贯']],
  ['trainingDirection', ['实训方向']],
  ['gender', ['性别']],
  ['phone', ['手机号', '手机', '联系方式']],
  ['destination', ['去向']],
  ['internCompany', ['实习单位名称', '就业单位名称', '单位名称', '实习公司']],
  ['internLocation', ['实习单位具体地点', '就业单位具体地点', '具体地点', '单位地点']],
  ['internContact', ['实习单位联系人', '就业单位联系人']],
  ['internContactPhone', ['实习单位联系人电话', '就业单位联系人电话', '联系人电话', '联系电话']],
  ['businessLine', ['具体业务线', '业务线']],
  ['internPosition', ['实习岗位', '就业岗位', '岗位']],
  ['internSalary', ['实习薪资', '就业薪资', '薪资']],
  ['internStartDate', ['实习入职时间', '入职时间', '开始时间']],
  ['internEndDate', ['实习结束时间', '实习结束世间', '就业结束时间', '结束时间']],
  ['gradSchool', ['考研目标院校', '目标院校', '考研院校']],
  ['gradMajor', ['目标专业', '考研专业']],
  ['remark', ['备注']],
];

function columnIndex(headers, aliases) {
  for (const alias of aliases) {
    const exact = headers.indexOf(alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    const idx = headers.findIndex((header) => {
      if (!header || !header.includes(alias)) return false;
      if (alias.includes('联系人') && !alias.includes('电话') && header.includes('电话')) return false;
      if (alias === '岗位' && /分类|类别|类型/.test(header)) return false;
      return true;
    });
    if (idx >= 0) return idx;
  }
  return -1;
}

function cellText(value) {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = value.getMonth() + 1;
    const day = value.getDate();
    return `${value.getFullYear()}/${month}/${day}`;
  }
  return String(value).trim();
}

function emptyParseResult(issues = []) {
  return { items: [], skipped: 0, total: 0, dailyConverted: 0, issues };
}

function excelRowNumber(row, index, rowNumbers) {
  if (Array.isArray(rowNumbers) && Number.isInteger(rowNumbers[index]) && rowNumbers[index] > 0) {
    return rowNumbers[index];
  }
  if (row && typeof row === 'object' && !Array.isArray(row) && Number.isInteger(row.__rowNum__) && row.__rowNum__ >= 0) {
    return row.__rowNum__ + 1;
  }
  return index + 1;
}

function scanHeaderIssue(matrix, rowNumbers) {
  const limit = Math.min(matrix.length, 8);
  const actual = [];
  for (let i = 0; i < limit; i += 1) {
    const headers = (matrix[i] || []).map(normHeader).filter(Boolean);
    const row = excelRowNumber(matrix[i], i, rowNumbers);
    const hasName = headers.includes('姓名') ? '有姓名' : '无姓名';
    const hasId = headers.includes('学号') ? '有学号' : '无学号';
    actual.push(`第 ${row} 行${hasName}/${hasId}：${headers.length ? headers.join('、') : '（空行）'}`);
  }
  return {
    row: excelRowNumber(matrix[0], 0, rowNumbers),
    code: 'HEADER_NOT_FOUND',
    fields: ['studentName', 'studentId'],
    message: `未能识别表头：需要同一行同时包含「姓名」和「学号」（模板第一行可以是标题）。已扫描 Excel 前 ${limit} 行。实际识别：${actual.join('；') || '没有任何单元格'}`,
  };
}

function unsupportedImportColumns(headers) {
  const found = [];
  const seen = new Set();
  const add = (label) => {
    if (!seen.has(label)) {
      seen.add(label);
      found.push(label);
    }
  };
  for (const header of headers) {
    if (!header) continue;
    if (/岗位分类|岗位类别|岗位类型/.test(header)) add('岗位分类');
    if (/教师判定/.test(header)) add('教师判定');
    if (/SOP/.test(header)) add('是否SOP岗位');
    if (/明星/.test(header)) add('是否实习明星');
    if (/企业分类|企业类别/.test(header)) add('企业分类');
    if (/学历|培养层次/.test(header)) add('学历');
  }
  return found;
}

function parseMatrix(matrix, rowNumbers) {
  if (!Array.isArray(matrix) || !matrix.length) {
    return emptyParseResult([{
      row: 1,
      code: 'EMPTY_SHEET',
      message: '工作表没有可读行。请使用含「姓名」「学号」表头的表格，模板第一行可以是标题。',
    }]);
  }

  let headerAt = -1;
  const limit = Math.min(matrix.length, 8);
  for (let i = 0; i < limit; i += 1) {
    const headers = (matrix[i] || []).map(normHeader);
    if (headers.includes('姓名') && headers.includes('学号')) {
      headerAt = i;
      break;
    }
  }
  if (headerAt < 0) {
    return emptyParseResult([scanHeaderIssue(matrix, rowNumbers)]);
  }

  const headers = (matrix[headerAt] || []).map(normHeader);
  const indexes = Object.fromEntries(SHEET_FIELDS.map(([key, aliases]) => [key, columnIndex(headers, aliases)]));
  const items = [];
  const issues = [];
  let skipped = 0;
  let total = 0;
  let dailyConverted = 0;
  const unsupported = unsupportedImportColumns(headers);
  if (unsupported.length) {
    issues.push({
      row: excelRowNumber(matrix[headerAt], headerAt, rowNumbers),
      code: 'UNSUPPORTED_COLUMNS',
      fields: unsupported,
      message: `表头含当前不支持导入的列：${unsupported.join('、')}。以上列不会更新；岗位分类、SOP 和明星判定请通过看板的「判定」操作修改。企业分类与学历字段当前未接入。`,
    });
  }

  for (let i = headerAt + 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    const sourceRow = excelRowNumber(row, i, rowNumbers);
    if (!Array.isArray(row) || row.every((cell) => cellText(cell) === '')) continue;
    total += 1;
    const read = (key) => (indexes[key] >= 0 ? cellText(row[indexes[key]]) : '');
    const studentName = read('studentName');
    const studentId = read('studentId');
    if (!studentName || !studentId) {
      skipped += 1;
      const fields = [];
      if (!studentName) fields.push('studentName');
      if (!studentId) fields.push('studentId');
      issues.push({
        row: sourceRow,
        code: 'MISSING_REQUIRED',
        fields,
        message: `Excel 第 ${sourceRow} 行缺少必填字段：${fields.map((f) => (f === 'studentName' ? '姓名' : '学号')).join('、')}`,
      });
      continue;
    }
    const rawSalary = read('internSalary');
    const salary = analyzeSalary(rawSalary);
    if (rawSalary && salary.display && salary.display !== rawSalary && /天|日薪|每天/.test(rawSalary)) {
      dailyConverted += 1;
    }
    const trainingDirection = read('trainingDirection');
    const destinationRaw = read('destination');
    const emptyChartFields = [];
    if (!destinationRaw) emptyChartFields.push('destination');
    if (!trainingDirection) emptyChartFields.push('trainingDirection');
    if (emptyChartFields.length) {
      const labels = emptyChartFields.map((f) => (f === 'destination' ? '去向' : '实训方向'));
      issues.push({
        row: sourceRow,
        code: 'EMPTY_CHART_FIELD',
        fields: emptyChartFields,
        message: `Excel 第 ${sourceRow} 行${labels.join('、')}为空，导入后相关图表将无法体现该学生（原值未改，不拒绝导入）`,
      });
    }
    items.push({
      sourceRow,
      studentName,
      className: read('className'),
      studentId,
      hometown: read('hometown'),
      trainingDirection,
      gender: read('gender'),
      phone: read('phone'),
      destination: canonicalDestination(destinationRaw),
      internCompany: read('internCompany'),
      internLocation: read('internLocation'),
      internContact: read('internContact'),
      internContactPhone: read('internContactPhone'),
      businessLine: read('businessLine'),
      internPosition: read('internPosition'),
      internSalary: salary.display,
      internStartDate: read('internStartDate'),
      internEndDate: read('internEndDate'),
      gradSchool: read('gradSchool'),
      gradMajor: read('gradMajor'),
      remark: read('remark'),
    });
  }
  return { items, skipped, total, dailyConverted, issues };
}

function parseObjectRows(rows) {
  if (!rows.length) {
    return emptyParseResult([{
      row: 1,
      code: 'EMPTY_SHEET',
      message: '工作表没有可读行。请使用含「姓名」「学号」表头的表格，模板第一行可以是标题。',
    }]);
  }
  const keys = Object.keys(rows[0]).filter((key) => key !== '__rowNum__');
  const firstRowNum = Number.isInteger(rows[0].__rowNum__) ? rows[0].__rowNum__ : null;
  const headerExcelRow = firstRowNum == null ? 1 : Math.max(1, firstRowNum);
  const matrix = [keys];
  const rowNumbers = [headerExcelRow];
  for (const row of rows) {
    matrix.push(keys.map((key) => row[key]));
    rowNumbers.push(Number.isInteger(row.__rowNum__) && row.__rowNum__ >= 0 ? row.__rowNum__ + 1 : rowNumbers.length + 1);
  }
  return parseMatrix(matrix, rowNumbers);
}

/**
 * 解析学生实习表。保留 items/skipped/total/dailyConverted；新增 issues
 * （{row: Excel 1-based 行号, code, fields?, message}），item.sourceRow 供后端定位。
 * 表头须在前 8 行同时识别到「姓名」「学号」；失败时给出期望字段与实际扫描结果。
 * 去向/实训方向空值只警告不拒绝、不改原值。不导入教师判定、企业分类或学历字段。
 * 矩阵需 blankrows:true 以保留空行位置；对象行用 __rowNum__（0-based）还原物理行号。
 */
export function parseStudentSheet(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return emptyParseResult([{
      row: 1,
      code: 'EMPTY_SHEET',
      message: '工作表没有可读行。请使用含「姓名」「学号」表头的表格，模板第一行可以是标题。',
    }]);
  }
  if (Array.isArray(rows[0])) return parseMatrix(rows);
  return parseObjectRows(rows);
}
