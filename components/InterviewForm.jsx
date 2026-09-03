'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { withBasePath } from '../lib/base-path';


function parseQuestions(text) {
  return String(text || '')
    .split(/[\n\r|；;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function InterviewForm() {
  const router = useRouter();
  const formRef = useRef(null);
  const msgRef = useRef(null);
  const redirectTimer = useRef(null);
  const [msg, setMsg] = useState({ show: false, type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Unmount cleanup: prevent a late jump after navigating away
  useEffect(() => () => clearTimeout(redirectTimer.current), []);


  function showMsg(type, text) {
    setMsg({ show: true, type, text });
    requestAnimationFrame(() => {
      msgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function resetForm() {
    formRef.current?.reset();
  }

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const qList = parseQuestions(fd.get('questions'));
    if (qList.length === 0) {
      showMsg('error', '至少填写一条面试问题');
      return;
    }

    const studentName = String(fd.get('studentName') || '').trim();
    const studentId = String(fd.get('studentId') || '').trim();
    const department = String(fd.get('department') || '').trim();
    const company = String(fd.get('company') || '').trim();
    const position = String(fd.get('position') || '').trim();
    const jdText = String(fd.get('jdText') || '').trim();
    if (!studentName || !company || !position || !jdText) {
      showMsg('error', '姓名、单位名称、岗位、岗位招聘要求为必填项');
      return;
    }

    const btn = e.target.querySelector('button[type=submit]');
    const oldText = btn.textContent;
    setSubmitting(true);
    btn.textContent = '提交中...';

    try {
      const res = await fetch(withBasePath('/api/records'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, studentId, department, company, position, jdText, questions: qList }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      resetForm();
      setSuccess(true);
      redirectTimer.current = setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      showMsg('error', '提交失败：' + err.message);
    }

    setSubmitting(false);
    btn.textContent = oldText;
  }

  return (
    <div className="container">
      <div className="hero">
        <h1>面试问题登记</h1>
        <p>填完一次，你的面试经验就能帮到后面面试同岗位的同学。大约 3 分钟。</p>
      </div>
      <div
        id="msg"
        ref={msgRef}
        className={msg.show ? `msg show ${msg.type}` : 'msg'}
      >
        {msg.text}
      </div>
      <form id="form" ref={formRef} onSubmit={onSubmit}>
        <div className="card">
          <div className="card-title">基本信息</div>
          <div className="form-grid">
            <div className="form-group">
              <label>姓名 <span className="req">*</span></label>
              <input name="studentName" required placeholder="你的姓名" />
            </div>
            <div className="form-group">
              <label>学号 <span className="hint">选填</span></label>
              <input name="studentId" placeholder="学号" />
            </div>
            <div className="form-group">
              <label>部门 <span className="hint">选填</span></label>
              <input name="department" placeholder="如：计算机科学学院" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">岗位信息</div>
          <div className="form-grid">
            <div className="form-group">
              <label>单位名称 <span className="req">*</span></label>
              <input name="company" required placeholder="如：科大讯飞" />
            </div>
            <div className="form-group">
              <label>岗位 <span className="req">*</span></label>
              <input name="position" required placeholder="如：Java后端开发" />
            </div>
            <div className="form-group full">
              <label>岗位招聘要求 <span className="req">*</span></label>
              <textarea name="jdText" required placeholder="把招聘启事里的岗位职责和任职要求粘贴在这里..." />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title">面试问题</div>
          <div className="form-group">
            <label>面试问题 <span className="req">*</span> <span className="hint">全部写在这里，一条一行，请标好顺序</span></label>
            <textarea
              name="questions"
              rows={10}
              style={{ minHeight: 180 }}
              placeholder={"例如：\n介绍一下你做过的项目\n说说 React 和 Vue 的区别\nMySQL 索引是怎么实现的"}
            />
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={resetForm}>清空</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>提交登记</button>
        </div>
      </form>

      <div className={success ? 'detail-modal show' : 'detail-modal'}>
        <div className="box" style={{ textAlign: 'center', maxWidth: 360 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--success-light)',
              color: 'var(--success)',
              fontSize: 28,
              fontWeight: 700,
              lineHeight: '56px',
              margin: '0 auto 14px',
            }}
          >
            ✓
          </div>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>登记成功</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            感谢分享，这条经验会帮到后续面试同岗位的同学。
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 14 }}>
            2 秒后自动跳转到面试问题看板…
          </p>
        </div>
      </div>
    </div>
  );
}
