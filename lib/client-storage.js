const RECORDS_KEY = 'interview-platform.records';
const STUDENT_KEY = 'interview-platform.student-info';
const COUNTER_KEY = 'interview-platform.counter';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || '') || fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function readRecords() {
  const list = readJson(RECORDS_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function writeRecords(records) {
  writeJson(RECORDS_KEY, records);
}

export function nextId() {
  const stored = readJson(COUNTER_KEY, { n: 1 });
  const n = stored && stored.n ? stored.n : 1;
  writeJson(COUNTER_KEY, { n: n + 1 });
  return n;
}

export function addRecord(record) {
  const records = readRecords();
  record.id = nextId();
  record.createdAt = new Date().toISOString();
  records.push(record);
  writeRecords(records);
  return record;
}

export function deleteRecord(id) {
  const records = readRecords();
  const idx = records.findIndex((r) => r.id === Number(id));
  if (idx === -1) return false;
  records.splice(idx, 1);
  writeRecords(records);
  return true;
}

export function readStudentInfo() {
  const list = readJson(STUDENT_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function writeStudentInfo(list) {
  writeJson(STUDENT_KEY, list);
}

export function addStudentInfo(info) {
  const list = readStudentInfo();
  info.id = nextId();
  info.createdAt = new Date().toISOString();
  list.push(info);
  writeStudentInfo(list);
  return info;
}

export function deleteStudentInfo(id) {
  const list = readStudentInfo();
  const idx = list.findIndex((r) => r.id === Number(id));
  if (idx === -1) return false;
  list.splice(idx, 1);
  writeStudentInfo(list);
  return true;
}

export function batchAddStudentInfo(items) {
  const list = readStudentInfo();
  let count = 0;
  for (const item of items) {
    item.id = nextId();
    item.createdAt = new Date().toISOString();
    list.push(item);
    count++;
  }
  writeStudentInfo(list);
  return count;
}

export function batchAddRecords(items) {
  const records = readRecords();
  let count = 0;
  for (const item of items) {
    item.id = nextId();
    item.createdAt = new Date().toISOString();
    records.push(item);
    count++;
  }
  writeRecords(records);
  return count;
}

export function findCol(row, keywords) {
  const keys = Object.keys(row);
  for (const kw of keywords) {
    const found = keys.find((k) => k && k.includes(kw));
    if (found !== undefined) return row[found];
  }
  return '';
}
