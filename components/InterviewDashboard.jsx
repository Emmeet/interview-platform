'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ImportFeedback from './ImportFeedback';
import { analyzeAll } from '../lib/analyzer';
import { withBasePath } from '../lib/base-path';
import { parseRecordsSheet } from '../lib/interview-import';
import { readImportWorkbook } from '../lib/import-workbook';
import { createLabeledChart } from '../lib/chart-value-labels';

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

export default function InterviewDashboard() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [importFeedback, setImportFeedback] = useState(null);
  const [importing, setImporting] = useState(false);
  const chartCatRef = useRef(null);
  const chartHotRef = useRef(null);
  const chartCovRef = useRef(null);
  const chartsRef = useRef({});

  const analysis = useMemo(() => analyzeAll(records), [records]);

  async function loadAll({ clearOnError = true } = {}) {
    try {
      const res = await fetch(withBasePath('/api/records'), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      setRecords(Array.isArray(data.records) ? data.records : []);
      setLoadError('');
      return true;
    } catch (e) {
      if (clearOnError) {
        setRecords([]);
        setLoadError('加载失败：' + e.message);
      }
      return false;
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
        localCharts.cat = createLabeledChart(Chart, chartCatRef.current, {
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
        localCharts.hot = createLabeledChart(Chart, chartHotRef.current, {
          type: 'bar',
          data: { labels: hot.map((h) => h.keyword), datasets: [{ data: hot.map((h) => h.questionCount), backgroundColor: '#3b82f6' }] },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } } } },
        });
      }

      const cov = (analysis.coverage || []).slice(0, 12);
      if (cov.length && chartCovRef.current) {
        localCharts.cov = createLabeledChart(Chart, chartCovRef.current, {
          type: 'bar',
          data: {
            labels: cov.map((c) => c.keyword),
            datasets: [
              { label: 'JD 中出现', data: cov.map((c) => c.jdCount), backgroundColor: '#93c5fd' },
              { label: '被问到', data: cov.map((c) => c.askedCount), backgroundColor: '#3b82f6' },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { font: { size: 11 } } } } },
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
    const file = input.files[0];
    const fileName = file.name;
    let sheetName = '';
    setImporting(true);
    setImportFeedback(null);
    try {
      let buf;
      try {
        buf = await file.arrayBuffer();
      } catch (e) {
        setImportFeedback({
          type: 'error',
          title: '导入失败',
          message: '读取文件阶段：无法读取该文件',
          fileName,
          details: [e.message],
        });
        return;
      }

      const XLSX = await import('xlsx');
      let wb;
      try {
        wb = readImportWorkbook(XLSX, buf, fileName);
      } catch (e) {
        setImportFeedback({
          type: 'error',
          title: '导入失败',
          message: '读取文件阶段：文件格式无法解析，请使用 Excel 或 CSV',
          fileName,
          details: [e.message],
        });
        return;
      }

      if (!wb.SheetNames || !wb.SheetNames.length) {
        setImportFeedback({
          type: 'error',
          title: '导入失败',
          message: '读取文件阶段：文件中没有工作表',
          fileName,
        });
        return;
      }

      sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const parsed = parseRecordsSheet(rows);
      const parseIssues = Array.isArray(parsed.issues) ? parsed.issues : [];
      const headerBlocked = parseIssues.some((issue) => issue.code === 'MISSING_HEADERS' || issue.code === 'EMPTY_SHEET');

      if (headerBlocked || !parsed.items.length) {
        setImportFeedback({
          type: 'error',
          title: '导入失败',
          message: headerBlocked
            ? ('表头校验阶段：' + (parseIssues[0] && parseIssues[0].message ? parseIssues[0].message : '缺少必需表头或没有数据行'))
            : ('解析阶段：没有可导入的记录。共读取 ' + parsed.total + ' 行，跳过 ' + parsed.skipped + ' 条'),
          fileName,
          sheetName,
          details: parseIssues,
        });
        return;
      }

      let res;
      try {
        res = await fetch(withBasePath('/api/records/batch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: parsed.items }),
        });
      } catch (e) {
        setImportFeedback({
          type: 'error',
          title: '导入失败',
          message: '请求阶段：无法连接导入接口',
          fileName,
          sheetName,
          details: [e.message, ...parseIssues],
        });
        return;
      }

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setImportFeedback({
          type: 'error',
          title: '导入失败',
          message: '服务器响应阶段：返回了非 JSON（HTTP ' + res.status + '）',
          fileName,
          sheetName,
          details: parseIssues,
        });
        return;
      }

      const imported = Number(data.imported) || 0;
      const skipped = (parsed.skipped || 0) + (Number(data.skipped) || 0);
      const details = parseIssues.concat(Array.isArray(data.issues) ? data.issues : []);

      if (!res.ok) {
        setImportFeedback({
          type: 'error',
          title: '导入失败',
          message: (res.status >= 500 ? '数据库写入阶段：' : '服务器响应阶段：') + (data.error || ('HTTP ' + res.status)),
          fileName,
          sheetName,
          details,
        });
        return;
      }

      if (imported <= 0) {
        setImportFeedback({
          type: 'error',
          title: '导入失败',
          message: '成功 0 条，跳过 ' + skipped + ' 条，共读取 ' + parsed.total + ' 行',
          fileName,
          sheetName,
          details,
        });
        return;
      }

      const partial = skipped > 0 || details.length > 0;
      const feedback = {
        type: partial ? 'warning' : 'success',
        title: partial ? '部分导入成功' : '导入成功',
        message: '成功 ' + imported + ' 条，跳过 ' + skipped + ' 条，共读取 ' + parsed.total + ' 行',
        fileName,
        sheetName,
        details,
      };
      setImportFeedback(feedback);

      const refreshed = await loadAll({ clearOnError: false });
      if (!refreshed) {
        setImportFeedback({
          ...feedback,
          type: 'warning',
          title: '导入成功但列表刷新失败',
          message: '已写入 ' + imported + ' 条，但列表刷新失败，请手动刷新页面查看。导入结果：成功 ' + imported + ' 条，跳过 ' + skipped + ' 条',
        });
      }
    } catch (e) {
      setImportFeedback({
        type: 'error',
        title: '导入失败',
        message: e.message || '导入过程中发生未知错误',
        fileName,
        sheetName,
      });
    } finally {
      setImporting(false);
      input.value = '';
    }
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
    <div className="container dashboard-interview">
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
          <label
            className="btn btn-primary btn-sm"
            style={{ cursor: importing ? 'not-allowed' : 'pointer', position: 'relative', overflow: 'hidden', opacity: importing ? 0.65 : 1 }}
            aria-busy={importing}
            onClick={(e) => { if (importing) e.preventDefault(); }}
          >
            {importing ? '导入中…' : '导入 Excel'}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={importing}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, pointerEvents: 'none' }}
              onChange={(e) => importExcel(e.target)}
            />
          </label>
        </div>
        <ImportFeedback feedback={importFeedback} onDismiss={() => setImportFeedback(null)} />
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
                      <td className="cell-wrap">
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
        <div className="chart-box">
          <h3>高频考察关键词 Top10</h3>
          <div className="chart-canvas-wrap">
            <canvas ref={chartHotRef} id="chartHot" />
          </div>
        </div>
      </div>
      <div className="chart-box" style={{ marginBottom: 20 }}>
        <h3>JD 要求被问到的覆盖情况（被问到次数）</h3>
        <div className="chart-canvas-wrap">
          <canvas ref={chartCovRef} id="chartCov" />
        </div>
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
