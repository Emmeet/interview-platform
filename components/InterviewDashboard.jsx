'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeAll } from '../lib/analyzer';
import { findCol } from '../lib/client-storage';
import { withBasePath } from '../lib/base-path';

const TECH_KW = ['java','python','javascript','typescript','react','vue','angular','node','spring','mysql','redis','mongodb','sql','linux','docker','kubernetes','git','算法','数据结构','设计模式','并发','多线程','jvm','微服务','分布式','消息队列','kafka','机器学习','深度学习','大数据','前端','后端','测试','运维','实现','原理','复杂度','优化','架构','机制','手写','区别','流程'];
const PROJ_KW = ['项目','做过','介绍','实习','负责','职责','角色','亮点','难点','遇到','方案'];
const BEH_KW = ['团队','合作','协作','冲突','挑战','失败','成功','优点','缺点','为什么','职业','离职','加班','压力','印象','成就感','怎么处理','沟通'];
const OPEN_KW = ['怎么看','想法','如果','假设','未来','趋势','理解','思路','看法'];

function classifyLocal(q) {
  const t = String(q || '').toLowerCase();
  if (BEH_KW.some((k) => t.includes(k))) return '行为类';
  if (PROJ_KW.some((k) => t.includes(k))) return '项目深挖';
  if (TECH_KW.some((k) => t.includes(k))) return '技术类';
  if (OPEN_KW.some((k) => t.includes(k))) return '开放类';
  return '其他';
}

const CAT_BADGE = {
  '技术类': 'badge-tech',
  '项目深挖': 'badge-project',
  '行为类': 'badge-behavior',
  '开放类': 'badge-open',
  '其他': 'badge-other',
};

function parseRecordsSheet(rows) {
  // 长表（一行一个问题，含问题序号列）：按 单位+岗位+学生+轮次 聚合
  if (rows.some((r) => findCol(r, ['问题序号']) !== '')) {
    const groups = new Map();
    let skipped = 0;
    for (const row of rows) {
      const company = String(findCol(row, ['单位名称', '单位', '公司']) || '').trim();
      const name = String(findCol(row, ['学生序号']) || '').trim();
      const position = String(findCol(row, ['规范岗位名称', '岗位名称', '岗位', '职位']) || '').trim();
      if (!name && !company) { skipped++; continue; }

      const round = String(findCol(row, ['面试轮次', '轮次']) || '').trim();
      const key = [company, position, name, round].join('||');
      if (!groups.has(key)) {
        groups.set(key, {
          studentName: name,
          studentId: String(findCol(row, ['学号']) || '').trim(),
          department: String(findCol(row, ['部门', '院系', '学院']) || '').trim(),
          company,
          position,
          jdText: String(findCol(row, ['岗位JD', 'JD', '招聘', '岗位描述', '岗位要求', '任职']) || '').trim(),
          questions: [],
          result: String(findCol(row, ['面试结果', '结果']) || '').trim(),
        });
      }
      const g = groups.get(key);
      const q = String(findCol(row, ['面试问题', '问题']) || '').trim();
      if (q) g.questions.push({ n: Number(findCol(row, ['问题序号'])) || g.questions.length + 1, q });
      const jd = String(findCol(row, ['岗位JD']) || '').trim();
      if (!g.jdText && jd) g.jdText = jd;
    }
    const items = [...groups.values()].map((g) => ({
      ...g,
      questions: g.questions.sort((a, b) => a.n - b.n).map((x) => x.q),
    }));
    return { items, skipped, total: rows.length };
  }

  // 宽表（一行一场面试，多问题在单元格内换行）
  const items = [];
  let skipped = 0;
  for (const row of rows) {
    const name = String(findCol(row, ['学生序号']) || '').trim();
    const company = String(findCol(row, ['单位名称', '单位', '公司']) || '').trim();
    if (!name && !company) { skipped++; continue; }

    const qRaw = String(findCol(row, ['面试问题', '问题']) || '').trim();
    const questions = qRaw ? qRaw.split(/[\n\r|；;]/).map((s) => s.trim()).filter(Boolean) : [];

    items.push({
      studentName: name,
      studentId: String(findCol(row, ['学号']) || '').trim(),
      department: String(findCol(row, ['部门', '院系', '学院']) || '').trim(),
      company,
      position: String(findCol(row, ['规范岗位名称', '岗位', '职位']) || '').trim(),
      jdText: String(findCol(row, ['岗位JD', 'JD', '招聘', '岗位描述', '岗位要求', '任职']) || '').trim(),
      questions,
      result: String(findCol(row, ['面试结果', '结果']) || '').trim(),
    });
  }
  return { items, skipped, total: rows.length };
}

export default function InterviewDashboard() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState('');
  const chartCatRef = useRef(null);
  const chartHotRef = useRef(null);
  const chartCovRef = useRef(null);
  const chartsRef = useRef({});

  const analysis = useMemo(() => analyzeAll(records), [records]);

  async function loadAll() {
    try {
      const res = await fetch(withBasePath('/api/records'), { cache: 'no-store' });
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
    loadAll();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const localCharts = {};

    import('chart.js/auto').then(({ default: Chart }) => {
      if (cancelled) return;

      const catData = (analysis.questionCategories || []).filter((c) => c.count > 0);
      if (catData.length && chartCatRef.current) {
        localCharts.cat = new Chart(chartCatRef.current, {
          type: 'doughnut',
          data: {
            labels: catData.map((c) => c.category),
            datasets: [{ data: catData.map((c) => c.count), backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#94a3b8'] }],
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } },
        });
      }

      const hot = (analysis.hotKeywords || []).slice(0, 10);
      if (hot.length && chartHotRef.current) {
        localCharts.hot = new Chart(chartHotRef.current, {
          type: 'bar',
          data: { labels: hot.map((h) => h.keyword), datasets: [{ data: hot.map((h) => h.questionCount), backgroundColor: '#3b82f6' }] },
          options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } } } },
        });
      }

      const cov = (analysis.coverage || []).slice(0, 12);
      if (cov.length && chartCovRef.current) {
        localCharts.cov = new Chart(chartCovRef.current, {
          type: 'bar',
          data: {
            labels: cov.map((c) => c.keyword),
            datasets: [
              { label: 'JD 中出现', data: cov.map((c) => c.jdCount), backgroundColor: '#93c5fd' },
              { label: '被问到', data: cov.map((c) => c.questionCount), backgroundColor: '#3b82f6' },
            ],
          },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } } } },
        });
      }
    });

    return () => {
      cancelled = true;
      Object.values(localCharts).forEach((c) => c && c.destroy());
    };
  }, [analysis]);

  const totalQ = records.reduce((s, r) => s + (r.questions || []).length, 0);
  const stats = [
    { num: records.length, label: '面试记录' },
    { num: totalQ, label: '面试问题' },
    { num: (analysis.companies || []).length, label: '涉及公司' },
  ];

  const list = records.filter((r) => {
    if (filterCompany && r.company !== filterCompany) return false;
    if (filterPosition && (r.positionStd || r.position) !== filterPosition) return false;
    if (filterDepartment && (r.department || '') !== filterDepartment) return false;
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      const hay = (r.studentName + ' ' + (r.department || '') + ' ' + r.company + ' ' + (r.positionStd || '') + ' ' + r.position + ' ' + (r.questions || []).join(' ') + ' ' + (r.jdText || '')).toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const header = ['ID', '姓名', '学号', '部门', '单位名称', '岗位', '规范岗位名称', '面试问题', '岗位招聘要求', '面试结果', '提交时间'];
    const rows = records.map((r) => [
      r.id, r.studentName, r.studentId, r.department || '', r.company, r.position, r.positionStd || r.position,
      (r.questions || []).join('\n'),
      r.jdText || '',
      r.result || '',
      r.createdAt || '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '面试记录');
    XLSX.writeFile(wb, 'interview-records.xlsx');
  }

  async function importExcel(input) {
    if (!input.files || !input.files[0]) return;
    try {
      const XLSX = await import('xlsx');
      const buf = await input.files[0].arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const { items, skipped, total } = parseRecordsSheet(rows);
      const res = await fetch(withBasePath('/api/records/batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      alert('导入完成：成功 ' + data.imported + ' 条，跳过 ' + (skipped + data.skipped) + ' 条，共读取 ' + total + ' 行');
      loadAll();
    } catch (e) {
      alert('导入失败：' + e.message);
    }
    input.value = '';
  }

  async function deleteRec(id) {
    if (!confirm('确认删除这条记录？')) return;
    try {
      const res = await fetch(withBasePath('/api/records/' + id), { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      loadAll();
    } catch (e) {
      alert('删除失败：' + e.message);
    }
  }

  return (
    <div className="container">
      <div className="hero">
        <h1>运营看板</h1>
        <p>全部面试经验记录与分析。支持筛选、查看详情、一键导出 Excel。</p>
      </div>
      <div className="stats-row cols-3" id="stats">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="num">{s.num}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">面试问题数据</div>
        <div className="toolbar">
          <input
            id="search"
            type="text"
            placeholder="搜索姓名 / 部门 / 公司 / 岗位 / 问题..."
            style={{ flex: 1, minWidth: 180 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select id="filterCompany" value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
            <option value="">公司名称</option>
            {(analysis.companies || []).map((c) => (
              <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
            ))}
          </select>
          <select id="filterPosition" value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
            <option value="">岗位名称</option>
            {(analysis.positions || []).map((p) => (
              <option key={p.name} value={p.name}>{p.name} ({p.count})</option>
            ))}
          </select>
          <select id="filterDepartment" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
            <option value="">部门</option>
            {(analysis.departments || []).map((d) => (
              <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
            ))}
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
        </div>
        <div id="tableWrap">
          {loadError ? (
            <div className="empty">{loadError}</div>
          ) : list.length === 0 ? (
            <div className="empty">暂无记录，让学生去填写页登记吧</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>姓名</th><th>部门</th><th>公司 / 岗位</th><th>问题数</th><th>问题类型</th><th>结果</th><th>时间</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const qs = r.questions || [];
                  const cats = [...new Set(qs.map(classifyLocal))];
                  const time = r.createdAt ? new Date(r.createdAt).toLocaleDateString('zh-CN') : '';
                  return (
                    <tr key={r.id}>
                      <td>{r.studentName || ''}</td>
                      <td>{r.department || '—'}</td>
                      <td>
                        {r.company || ''}
                        <br />
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                          {r.positionStd || r.position || ''}
                          {r.positionStd && r.position && r.positionStd !== r.position
                            ? `（原填写：${r.position}）`
                            : ''}
                        </span>
                      </td>
                      <td>{qs.length}</td>
                      <td>
                        {cats.map((c, i) => (
                          <span key={c}>
                            {i > 0 ? ' ' : ''}
                            <span className={'badge ' + (CAT_BADGE[c] || 'badge-other')}>{c}</span>
                          </span>
                        ))}
                      </td>
                      <td>{r.result || '—'}</td>
                      <td>{time}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetail(r)}>详情</button>{' '}
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
        <div className="chart-box"><h3>面试问题分类分布</h3><canvas ref={chartCatRef} id="chartCat" /></div>
        <div className="chart-box"><h3>高频考察关键词 Top10</h3><canvas ref={chartHotRef} id="chartHot" /></div>
      </div>
      <div className="chart-box" style={{ marginBottom: 20 }}>
        <h3>JD 要求被问到的覆盖情况（被问到次数）</h3>
        <canvas ref={chartCovRef} id="chartCov" />
      </div>

      <div
        className={detail ? 'detail-modal show' : 'detail-modal'}
        id="modal"
        onClick={(e) => { if (e.target === e.currentTarget) setDetail(null); }}
      >
        {detail ? (
          <div className="box" id="modalBody">
            <h2 style={{ fontSize: 17, marginBottom: 6 }}>
              {detail.studentName || ''} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 13 }}>{detail.studentId || ''}</span>
            </h2>
            <p style={{ color: 'var(--muted)', marginBottom: 4 }}>
              {detail.department ? detail.department + ' · ' : ''}
              {detail.company || ''} · {detail.positionStd || detail.position || ''}
              {detail.positionStd && detail.position && detail.positionStd !== detail.position
                ? `（原填写：${detail.position}）`
                : ''}
              {detail.result ? ' · ' + detail.result : ''}
            </p>
            {detail.createdAt ? (
              <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>
                提交于 {new Date(detail.createdAt).toLocaleString('zh-CN')}
                {detail.updatedAt && detail.updatedAt !== detail.createdAt
                  ? ' · 更新于 ' + new Date(detail.updatedAt).toLocaleString('zh-CN')
                  : ''}
              </p>
            ) : null}
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>面试问题（{(detail.questions || []).length} 条）</h3>
            <div style={{ marginBottom: 16 }}>
              {(detail.questions || []).map((q, i) => {
                const cat = classifyLocal(q);
                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <span className={`badge ${CAT_BADGE[cat] || 'badge-other'}`}>{cat}</span>
                    <span style={{ marginLeft: 6 }}>{q}</span>
                  </div>
                );
              })}
            </div>
            {detail.jdText ? (
              <>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>岗位招聘要求</h3>
                <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: 12, marginBottom: 16 }}>
                  {detail.jdText}
                </div>
              </>
            ) : null}
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>关闭</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
