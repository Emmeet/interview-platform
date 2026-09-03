'use client';

import { useEffect, useRef, useState } from 'react';
import { findCol } from '../lib/client-storage';
import { withBasePath } from '../lib/base-path';

const CATEGORY_OPTIONS = ['待判定', 'SOP类IT岗位', '非SOP类IT岗位', 'IT企业的非IT岗位', '其它岗位', '自主创业', '升学、公职类'];
const STATUS_OPTIONS = ['待判定', '是', '否'];

function parseStudentSheet(rows) {
  const items = [];
  let skipped = 0;
  for (const row of rows) {
    const name = String(findCol(row, ['姓名']) || '').trim();
    if (!name) { skipped++; continue; }

    let dest = String(findCol(row, ['去向']) || '').trim();
    if (dest === '实习') dest = '实习就业';

    items.push({
      studentName: name,
      className: String(findCol(row, ['班级']) || '').trim(),
      studentId: String(findCol(row, ['学号']) || '').trim(),
      hometown: String(findCol(row, ['籍贯']) || '').trim(),
      trainingDirection: String(findCol(row, ['实训方向']) || '').trim(),
      gender: String(findCol(row, ['性别']) || '').trim(),
      phone: String(findCol(row, ['手机', '电话', '联系方式']) || '').trim(),
      destination: dest,
      internCompany: String(findCol(row, ['实习单位名称', '单位名称', '实习公司']) || '').trim(),
      internLocation: String(findCol(row, ['具体地点', '单位地点']) || '').trim(),
      internContact: String(findCol(row, ['联系人']) && !String(findCol(row, ['联系人'])).includes('电话') ? findCol(row, ['联系人']) : findCol(row, ['实习单位联系人']) || '').trim(),
      internContactPhone: String(findCol(row, ['联系人电话', '联系电话']) || '').trim(),
      businessLine: String(findCol(row, ['业务线']) || '').trim(),
      internPosition: String(findCol(row, ['实习岗位', '岗位']) || '').trim(),
      internSalary: String(findCol(row, ['实习薪资', '薪资']) || '').trim(),
      internStartDate: String(findCol(row, ['入职时间', '开始时间']) || '').trim(),
      internEndDate: String(findCol(row, ['结束时间']) || '').trim(),
      gradSchool: String(findCol(row, ['考研目标院校', '目标院校', '考研院校']) || '').trim(),
      gradMajor: String(findCol(row, ['目标专业', '考研专业']) || '').trim(),
      remark: String(findCol(row, ['备注']) || '').trim(),
      jobCategory: String(findCol(row, ['岗位分类', '岗位类别', '岗位类型']) || '').trim() || '待判定',
      sopStatus: String(findCol(row, ['是否SOP岗位', 'SOP岗位', 'SOP']) || '').trim() || '待判定',
      starStatus: String(findCol(row, ['是否实习明星', '实习明星', '明星']) || '').trim() || '待判定',
    });
  }
  return { items, skipped, total: rows.length };
}

export default function DataDashboard() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDest, setFilterDest] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ jobCategory: '待判定', sopStatus: '待判定', starStatus: '待判定' });
  const [loadError, setLoadError] = useState('');
  const [configs, setConfigs] = useState([]);
  const [configId, setConfigId] = useState('');
  const selectedConfig = configs.find((c) => String(c.id) === String(configId));

  const chartClassRef = useRef(null);
  const chartDestRef = useRef(null);
  const chartDirRef = useRef(null);
  const chartSopRef = useRef(null);
  const chartStarRef = useRef(null);
  const chartsRef = useRef({});

  async function loadAll(cid = configId) {
    if (!cid) {
      setRecords([]);
      return;
    }
    try {
      const res = await fetch(withBasePath('/api/student-info?configId=' + encodeURIComponent(cid)), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      setRecords(Array.isArray(data.records) ? data.records : []);
      setLoadError('');
    } catch (e) {
      setRecords([]);
      setLoadError('加载失败：' + e.message);
    }
  }

  useEffect(() => {
    fetch(withBasePath('/api/tracking-configs'), { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        const list = Array.isArray(data.configs) ? data.configs : [];
        setConfigs(list);
        if (list.length && !configId) setConfigId(String(list[0].id));
      })
      .catch((e) => setLoadError('读取跟踪项目失败：' + e.message));
  }, []);

  useEffect(() => {
    if (!configId) return;
    loadAll(configId);
  }, [configId]);

  useEffect(() => {
    let cancelled = false;

    import('chart.js/auto').then(({ default: Chart }) => {
      if (cancelled) return;
      const localCharts = {};

      const clsMap = {};
      ['一班', '二班', '三班', '四班', '五班', '六班'].forEach((c) => { clsMap[c] = 0; });
      records.forEach((r) => { if (r.className && clsMap[r.className] !== undefined) clsMap[r.className]++; });
      const clsData = Object.entries(clsMap).filter(([, v]) => v > 0);
      if (clsData.length && chartClassRef.current) {
        localCharts.cls = new Chart(chartClassRef.current, {
          type: 'bar',
          data: { labels: clsData.map((d) => d[0]), datasets: [{ data: clsData.map((d) => d[1]), backgroundColor: '#60a5fa' }] },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } } },
        });
      }

      const destMap = { '实习就业': 0, '待实习': 0, '备考研究生': 0, '备考公务员': 0 };
      records.forEach((r) => {
        if (!r.destination) return;
        const key = (r.destination === '实习' || r.destination === '就业') ? '实习就业' : r.destination;
        if (destMap[key] !== undefined) destMap[key]++;
      });
      const destData = Object.entries(destMap).filter(([, v]) => v > 0);
      if (destData.length && chartDestRef.current) {
        localCharts.dest = new Chart(chartDestRef.current, {
          type: 'doughnut',
          data: { labels: destData.map((d) => d[0]), datasets: [{ data: destData.map((d) => d[1]), backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'] }] },
          options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } },
        });
      }

      function statusChart(key, canvas, values, order, colors) {
        const map = {};
        order.forEach((k) => { map[k] = 0; });
        values.forEach((v) => { if (map[v] !== undefined) map[v]++; });
        const data = order.map((label) => ({ label, count: map[label] })).filter((d) => d.count > 0);
        if (!data.length || !canvas) return;
        localCharts[key] = new Chart(canvas, {
          type: 'doughnut',
          data: { labels: data.map((d) => d.label), datasets: [{ data: data.map((d) => d.count), backgroundColor: colors }] },
          options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } },
        });
      }

      statusChart('sop', chartSopRef.current, records.map((r) => r.sopStatus || '待判定'), ['是', '否', '待判定'], ['#22c55e', '#94a3b8', '#f59e0b']);
      statusChart('star', chartStarRef.current, records.map((r) => r.starStatus || '待判定'), ['是', '否', '待判定'], ['#22c55e', '#94a3b8', '#f59e0b']);

      const dirMap = { '前端实训1-3班': 0, '前端实训4-6班': 0, '后端实训': 0 };
      records.forEach((r) => { if (r.trainingDirection && dirMap[r.trainingDirection] !== undefined) dirMap[r.trainingDirection]++; });
      const dirData = Object.entries(dirMap).filter(([, v]) => v > 0);
      if (dirData.length && chartDirRef.current) {
        localCharts.dir = new Chart(chartDirRef.current, {
          type: 'bar',
          data: { labels: dirData.map((d) => d[0]), datasets: [{ data: dirData.map((d) => d[1]), backgroundColor: ['#60a5fa', '#34d399', '#f59e0b'] }] },
          options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } } } },
        });
      }

      chartsRef.current = localCharts;
    });

    return () => {
      cancelled = true;
      Object.values(chartsRef.current).forEach((c) => c.destroy());
      chartsRef.current = {};
    };
  }, [records]);

  const internCount = records.filter((r) => r.destination === '实习就业' || r.destination === '实习' || r.destination === '就业').length;
  const pendingCount = records.filter((r) => r.destination === '待实习').length;
  const gradCount = records.filter((r) => r.destination === '备考研究生').length;
  const civilCount = records.filter((r) => r.destination === '备考公务员').length;
  const stats = [
    { num: records.length, label: '总记录数' },
    { num: internCount, label: selectedConfig && selectedConfig.type === '就业' ? '就业' : '实习' },
    { num: pendingCount, label: '待实习' },
    { num: gradCount, label: '备考研究生' },
    { num: civilCount, label: '备考公务员' },
  ];

  const list = records.filter((r) => {
    if (filterClass && r.className !== filterClass) return false;
    if (filterDest) {
      if (filterDest === '实习就业') {
        if (r.destination !== '实习就业' && r.destination !== '实习' && r.destination !== '就业') return false;
      } else if (r.destination !== filterDest) {
        return false;
      }
    }
    if (filterDir && r.trainingDirection !== filterDir) return false;
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      const hay = (r.studentName + ' ' + r.studentId + ' ' + r.internCompany + ' ' + r.internPosition + ' ' + r.gradSchool).toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const header = [
      '序号', '姓名', '班级', '学号', '籍贯', '实训方向', '性别', '手机号',
      '去向', '实习单位名称', '实习单位具体地点', '实习单位联系人', '实习单位联系人电话',
      '具体业务线', '实习岗位', '实习薪资', '入职时间', '实习结束时间',
      '考研目标院校', '目标专业', '备注', '岗位分类', '是否SOP岗位', '是否实习明星',
    ];
    const rows = records.map((r, i) => [
      i + 1, r.studentName, r.className, r.studentId, r.hometown,
      r.trainingDirection, r.gender, r.phone, r.destination,
      r.internCompany, r.internLocation, r.internContact, r.internContactPhone,
      r.businessLine, r.internPosition, r.internSalary, r.internStartDate, r.internEndDate,
      r.gradSchool, r.gradMajor, r.remark,
      r.jobCategory || '待判定', r.sopStatus || '待判定', r.starStatus || '待判定',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 6 }, { wch: 14 }, { wch: 18 },
      { wch: 20 }, { wch: 36 }, { wch: 12 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 18 }, { wch: 16 }, { wch: 24 },
      { wch: 18 }, { wch: 14 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '实习统计');
    const title = (configs.find((c) => String(c.id) === String(configId)) || {}).title || '实习就业数据';
    XLSX.writeFile(wb, title + '.xlsx');
  }

  async function importExcel(input) {
    if (!input.files || !input.files[0]) return;
    try {
      const XLSX = await import('xlsx');
      const buf = await input.files[0].arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const { items, skipped, total } = parseStudentSheet(rows);
      if (!configId) throw new Error('请先选择跟踪项目，再导入');
      const res = await fetch(withBasePath('/api/student-info/batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, configId: Number(configId) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      alert('导入完成：成功 ' + data.imported + ' 条，跳过 ' + (skipped + (data.skipped || 0)) + ' 条，共读取 ' + total + ' 行');
      loadAll();
    } catch (e) {
      alert('导入失败：' + e.message);
    }
    input.value = '';
  }

  async function deleteRec(id) {
    if (!confirm('确认删除这条记录？')) return;
    try {
      const res = await fetch(withBasePath('/api/student-info/' + id), { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      loadAll();
    } catch (e) {
      alert('删除失败：' + e.message);
    }
  }

  function openDetail(id) {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    setDetail(r);
    setEditing(false);
  }

  function editAssessment(r) {
    setDetail(r);
    setEditForm({
      jobCategory: r.jobCategory || '待判定',
      sopStatus: r.sopStatus || '待判定',
      starStatus: r.starStatus || '待判定',
    });
    setEditing(true);
  }

  async function saveAssessment(id) {
    try {
      const res = await fetch(withBasePath('/api/student-info/' + id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      setEditing(false);
      setDetail(null);
      loadAll();
    } catch (e) {
      alert('保存失败：' + e.message);
    }
  }

  function closeModal() {
    setDetail(null);
    setEditing(false);
  }


  function switchConfig(id) {
    if (String(id) === String(configId)) return;
    setConfigId(String(id));
    setSearch('');
    setFilterClass('');
    setFilterDest('');
    setFilterDir('');
    setDetail(null);
    setEditing(false);
  }

  return (
    <div className="container">
      <div className="config-switch" role="tablist" aria-label="跟踪项目">
        {configs.length === 0 ? (
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>暂无跟踪项目</span>
        ) : configs.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            className={String(configId) === String(c.id) ? 'active' : undefined}
            onClick={() => switchConfig(c.id)}
          >
            {c.title}
            <span className={`type-tag ${c.type === '就业' ? 'job' : 'intern'}`}>{c.type === '就业' ? '就业' : '实习'}</span>
          </button>
        ))}
      </div>
      <div className="hero">
        <h1>
          {selectedConfig ? selectedConfig.title : '信息看板'}
          {selectedConfig ? (
            <span className={`type-tag ${selectedConfig.type === '就业' ? 'job' : 'intern'}`}>
              {selectedConfig.type === '就业' ? '就业' : '实习'}
            </span>
          ) : null}
        </h1>
        <p>
          分析该跟踪项目下学生提交的
          {selectedConfig && selectedConfig.type === '就业' ? '就业' : '实习'}
          数据。仅展示已启用的跟踪项目。支持筛选、详情、判定与导出。
        </p>
      </div>
      <div className="stats-row" id="stats">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="num">{s.num}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="chart-box"><h3>各班级人数分布</h3><canvas ref={chartClassRef} id="chartClass" /></div>
        <div className="chart-box"><h3>去向分布</h3><canvas ref={chartDestRef} id="chartDest" /></div>
      </div>
      <div className="chart-box" style={{ marginBottom: 20 }}>
        <h3>实训方向分布</h3>
        <canvas ref={chartDirRef} id="chartDir" />
      </div>
      <div className="card">
        <div className="card-title">学生信息记录</div>
        <div className="toolbar">
          <input
            id="search"
            type="text"
            placeholder="搜索姓名 / 学号 / 公司..."
            style={{ flex: 1, minWidth: 180 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select id="filterClass" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            <option value="">全部班级</option>
            <option value="一班">一班</option>
            <option value="二班">二班</option>
            <option value="三班">三班</option>
            <option value="四班">四班</option>
            <option value="五班">五班</option>
            <option value="六班">六班</option>
          </select>
          <select id="filterDest" value={filterDest} onChange={(e) => setFilterDest(e.target.value)}>
            <option value="">全部去向</option>
            <option value="实习就业">{selectedConfig && selectedConfig.type === '就业' ? '就业' : '实习'}</option>
            <option value="待实习">待实习</option>
            <option value="备考研究生">备考研究生</option>
            <option value="备考公务员">备考公务员</option>
          </select>
          <select id="filterDir" value={filterDir} onChange={(e) => setFilterDir(e.target.value)}>
            <option value="">全部方向</option>
            <option value="前端实训1-3班">前端实训1-3班</option>
            <option value="前端实训4-6班">前端实训4-6班</option>
            <option value="后端实训">后端实训</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={exportExcel}>导出 Excel</button>
          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>导入 Excel
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none' }}
              onChange={(e) => importExcel(e.target)}
            />
          </label>
          <button className="btn btn-ghost btn-sm" onClick={loadAll}>刷新</button>
        </div>
        <div id="tableWrap">
          {loadError ? (
            <div className="empty">{loadError}</div>
          ) : list.length === 0 ? (
            <div className="empty">当前跟踪项目暂无记录，让学生在填写页登记后刷新</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>姓名</th><th>班级</th><th>实训方向</th><th>去向</th><th>实习单位/岗位</th><th>考研院校</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const intern = (r.destination === '实习就业' || r.destination === '实习' || r.destination === '就业')
                    ? (r.internCompany || '—')
                    : '—';
                  const internSub = (r.destination === '实习就业' || r.destination === '实习' || r.destination === '就业')
                    ? (r.internPosition || '') + (r.internSalary ? ' · ' + r.internSalary : '')
                    : '';
                  const grad = r.destination === '备考研究生' ? (r.gradSchool || '—') : '—';
                  const gradSub = r.destination === '备考研究生' ? (r.gradMajor || '') : '';
                  return (
                    <tr key={r.id}>
                      <td>
                        {r.studentName || ''}
                        <br />
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{r.studentId || ''}</span>
                      </td>
                      <td>{r.className || '—'}</td>
                      <td>{r.trainingDirection || '—'}</td>
                      <td>{r.destination || '—'}</td>
                      <td>
                        {intern}
                        {internSub ? (
                          <>
                            <br />
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{internSub}</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        {grad}
                        {gradSub ? (
                          <>
                            <br />
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{gradSub}</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openDetail(r.id)}>详情</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => deleteRec(r.id)}>删除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-box"><h3>是否为 SOP 岗位</h3><canvas ref={chartSopRef} id="chartSop" /></div>
        <div className="chart-box"><h3>是否为实习明星</h3><canvas ref={chartStarRef} id="chartStar" /></div>
      </div>

      <div
        className={detail ? 'detail-modal show' : 'detail-modal'}
        id="modal"
        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
      >
        {detail && editing ? (
          <div className="box" id="modalBody">
            <h2 style={{ fontSize: 17, marginBottom: 6 }}>老师判定：{detail.studentName || ''}</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 16 }}>岗位：{detail.internPosition || '—'} · 单位：{detail.internCompany || '—'}</p>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>岗位分类</label>
              <select id="editJobCategory" value={editForm.jobCategory} onChange={(e) => setEditForm((f) => ({ ...f, jobCategory: e.target.value }))}>
                {CATEGORY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>是否为SOP岗位</label>
              <select id="editSopStatus" value={editForm.sopStatus} onChange={(e) => setEditForm((f) => ({ ...f, sopStatus: e.target.value }))}>
                {STATUS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>是否为实习明星</label>
              <select id="editStarStatus" value={editForm.starStatus} onChange={(e) => setEditForm((f) => ({ ...f, starStatus: e.target.value }))}>
                {STATUS_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ textAlign: 'right', marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={closeModal}>取消</button>{' '}
              <button className="btn btn-primary" onClick={() => saveAssessment(detail.id)}>保存判定</button>
            </div>
          </div>
        ) : detail ? (
          <div className="box" id="modalBody">
            <h2 style={{ fontSize: 17, marginBottom: 6 }}>{detail.studentName || ''}</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
              {(detail.className || '') + ' · ' + (detail.trainingDirection || '') + ' · ' + (detail.studentId || '') + ' · ' + (detail.gender || '') + ' · ' + (detail.phone || '')}
            </p>
            <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span>老师判定：{(detail.jobCategory || '待判定') + ' · SOP：' + (detail.sopStatus || '待判定') + ' · 实习明星：' + (detail.starStatus || '待判定')}</span>
                <button className="btn btn-primary btn-sm" onClick={() => editAssessment(detail)}>编辑判定</button>
              </div>
            </div>
            {detail.hometown ? <p style={{ marginBottom: 12 }}>籍贯：{detail.hometown}</p> : null}
            {detail.destination === '实习就业' || detail.destination === '实习' || detail.destination === '就业' ? (
              <>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>{selectedConfig && selectedConfig.type === '就业' ? '就业信息' : '实习信息'}</h3>
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                  单位名称：{detail.internCompany || '—'}<br />
                  实习岗位：{detail.internPosition || '—'}<br />
                  具体地点：{detail.internLocation || '—'}<br />
                  联系人：{detail.internContact || '—'}<br />
                  联系电话：{detail.internContactPhone || '—'}<br />
                  业务线：{detail.businessLine || '—'}<br />
                  薪资：{detail.internSalary || '—'}<br />
                  入职时间：{detail.internStartDate || '—'}<br />
                  结束时间：{detail.internEndDate || '—'}
                </div>
              </>
            ) : null}
            {detail.destination === '备考研究生' ? (
              <>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>考研信息</h3>
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                  目标院校：{detail.gradSchool || '—'}<br />
                  目标专业：{detail.gradMajor || '—'}
                </div>
              </>
            ) : null}
            {detail.remark ? (
              <>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>备注</h3>
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{detail.remark}</div>
              </>
            ) : null}
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={closeModal}>关闭</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
