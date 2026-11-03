import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { parseRecordsSheet } from '../lib/interview-import.js';
import { analyzeSalary, parseStudentSheet } from '../lib/intern-fields.js';
import { describeImportError } from '../lib/import-errors.js';
import { readImportWorkbook } from '../lib/import-workbook.js';

const XLSX = createRequire(import.meta.url)('xlsx');

function worksheet(matrix) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), '导入样例');
  const bytes = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const decoded = XLSX.read(bytes);
  return decoded.Sheets[decoded.SheetNames[0]];
}

test('面试导出表的姓名列能回读，问题保持换行顺序', () => {
  const ws = worksheet([
    ['ID', '姓名', '学号', '单位名称', '岗位', '面试问题', '岗位招聘要求'],
    [1, '回读样例', 'sample-01', '样例公司', 'Java开发', '第一题\n第二题', 'Java MySQL'],
  ]);
  const parsed = parseRecordsSheet(XLSX.utils.sheet_to_json(ws, { defval: '' }));
  assert.deepEqual(parsed.items.map(({ studentName, studentId, company, questions, jdText }) => (
    { studentName, studentId, company, questions, jdText }
  )), [{ studentName: '回读样例', studentId: 'sample-01', company: '样例公司', questions: ['第一题', '第二题'], jdText: 'Java MySQL' }]);
});

test('长表按学生及轮次分组，按问题序号排序', () => {
  const ws = worksheet([
    ['学生序号', '单位名称', '岗位名称', '面试轮次', '问题序号', '面试问题'],
    ['学生1', '样例公司', '前端开发', '一面', 2, '第二题'],
    ['学生1', '样例公司', '前端开发', '一面', 1, '第一题'],
    ['学生1', '样例公司', '前端开发', '二面', 1, '二面题'],
    ['学生2', '样例公司', '前端开发', '一面', 1, '另一位学生的问题'],
  ]);
  const parsed = parseRecordsSheet(XLSX.utils.sheet_to_json(ws, { defval: '' }));
  assert.deepEqual(parsed.items.map(({ studentName, questions }) => ({ studentName, questions })), [
    { studentName: '学生1', questions: ['第一题', '第二题'] },
    { studentName: '学生1', questions: ['二面题'] },
    { studentName: '学生2', questions: ['另一位学生的问题'] },
  ]);
});

test('面试缺学生标识时报告物理行号，不把无效记录当作可导入', () => {
  const ws = worksheet([['学生序号', '单位名称', '面试问题']]);
  XLSX.utils.sheet_add_aoa(ws, [['', '样例公司', '缺少学生标识的问题']], { origin: 'A441' });
  const parsed = parseRecordsSheet(XLSX.utils.sheet_to_json(ws, { defval: '' }));
  assert.deepEqual(parsed.items, []);
  assert.equal(parsed.skipped, 1);
  assert.ok(parsed.issues.some((issue) => issue.row === 441));
});

test('学生表标题、括号表头、空行不影响字段对应及错误物理行号', () => {
  const ws = worksheet([
    ['实习统计标题'],
    ['姓名', '学号', '班级', '去向（实习/备考研究生/备考公务员）', '实习单位名称', '实习单位联系人', '实习单位联系人电话', '实习薪资', '实训方向'],
    ['有效样例', 'sample-02', '一班', '实习', '样例公司', '联系人样例', '01012345678', '300元/天', '后端实训'],
    [],
    ['缺学号样例', '', '一班', '待实习'],
  ]);
  const parsed = parseStudentSheet(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: true }));
  assert.deepEqual(parsed.items.map(({ studentName, studentId, destination, internCompany, internContact, internContactPhone }) => (
    { studentName, studentId, destination, internCompany, internContact, internContactPhone }
  )), [{ studentName: '有效样例', studentId: 'sample-02', destination: '已找到实习单位', internCompany: '样例公司', internContact: '联系人样例', internContactPhone: '01012345678' }]);
  assert.equal(analyzeSalary(parsed.items[0].internSalary).monthly, 6600);
  assert.equal(parsed.skipped, 1);
  assert.ok(parsed.issues.some((issue) => issue.row === 5));
});

test('图表字段未填写仍保留学生，不套用尚未实施的新去向规则', () => {
  const parsed = parseStudentSheet([
    ['姓名', '学号', '去向', '实训方向'],
    ['待补充样例', 'sample-03', '', ''],
  ]);
  assert.deepEqual(parsed.items.map(({ studentName, studentId, destination, trainingDirection }) => (
    { studentName, studentId, destination, trainingDirection }
  )), [{ studentName: '待补充样例', studentId: 'sample-03', destination: '', trainingDirection: '' }]);
  assert.equal(parsed.skipped, 0);
  assert.ok(parsed.issues.some((issue) => issue.row === 2));
});

test('数据库失败保留可诊断错误代码，不回显查询与连接凭据', () => {
  const error = Object.assign(new Error('connect failed host=private-db password=secret-value'), {
    code: 'ECONNREFUSED',
    sql: 'INSERT INTO student_info VALUES (private-data)',
    stack: 'private-stack',
  });
  const message = describeImportError(error);
  assert.match(message, /ECONNREFUSED/);
  assert.doesNotMatch(message, /private-db|secret-value|private-data|private-stack|INSERT INTO/);
});

test('数据库字段超长错误包含稳定错误码和字段定位', () => {
  const message = describeImportError({ code: 'ER_DATA_TOO_LONG', sqlMessage: "Data too long for column 'intern_company' at row 1" });
  assert.match(message, /ER_DATA_TOO_LONG/);
  assert.match(message, /实习单位名称/);
});

for (const encoding of ['utf8', 'utf16le']) {
  test(`中文 ${encoding} CSV 保持姓名表头与多行问题`, () => {
    const csv = '姓名,单位名称,面试问题\nCSV样例,样例公司,"第一题\n第二题"\n';
    const bytes = Buffer.from((encoding === 'utf16le' ? '\ufeff' : '') + csv, encoding);
    const wb = readImportWorkbook(XLSX, bytes, 'template.csv');
    const parsed = parseRecordsSheet(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }));
    assert.deepEqual(parsed.items.map(({ studentName, company, questions }) => ({ studentName, company, questions })), [
      { studentName: 'CSV样例', company: '样例公司', questions: ['第一题', '第二题'] },
    ]);
  });
}

test('非支持编码的 CSV 给出稳定编码错误，而非乱码表头', () => {
  assert.throws(() => readImportWorkbook(XLSX, new Uint8Array([0x81, 0x40]), 'template.csv'), { code: 'INVALID_CSV_ENCODING' });
});
