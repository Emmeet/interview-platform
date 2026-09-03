'use client';

import { useEffect, useRef, useState } from 'react';
import { MUNICIPALITIES, PROVINCE_CITY } from '../lib/region-data';
import { withBasePath } from '../lib/base-path';

const PROVINCES = Object.keys(PROVINCE_CITY);

function splitHometown(hometown) {
  const s = String(hometown || '').trim();
  if (!s) return { province: '', city: '' };
  if (MUNICIPALITIES.includes(s)) return { province: s, city: s };
  for (const p of PROVINCES) {
    if (s.startsWith(p)) {
      const rest = s.slice(p.length);
      const list = PROVINCE_CITY[p] || [];
      const matched = list.find((c) => rest === c || rest.startsWith(c));
      return { province: p, city: matched || rest };
    }
  }
  return { province: '', city: '' };
}

function setFormValue(form, name, value) {
  if (form && form.elements[name]) form.elements[name].value = value || '';
}
function isInternOrJob(dest) {
  return dest === '实习' || dest === '就业' || dest === '实习就业';
}


export default function StudentInfoForm() {
  const formRef = useRef(null);
  const [msg, setMsg] = useState({ show: false, type: '', text: '' });
  const [destination, setDestination] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [querying, setQuerying] = useState(false);

  const [configs, setConfigs] = useState([]);
  const [configId, setConfigId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [lookedUp, setLookedUp] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pendingFill, setPendingFill] = useState(null);

  const selectedConfig = configs.find((c) => String(c.id) === String(configId));
  const configType = selectedConfig && selectedConfig.type === '就业' ? '就业' : '实习';
  const unitWord = configType;

  useEffect(() => {
    let cancelled = false;
    fetch(withBasePath('/api/tracking-configs'), { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        if (cancelled) return;
        const list = Array.isArray(data.configs) ? data.configs : [];
        setConfigs(list);
        if (list.length === 1) setConfigId(String(list[0].id));
      })
      .catch((e) => {
        if (!cancelled) showMsg('读取跟踪配置失败：' + e.message, 'error');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!lookedUp || !pendingFill) return;
    fillRecord(pendingFill);
    setPendingFill(null);
  }, [lookedUp, pendingFill]);

  function showMsg(text, type) {
    setMsg({ show: true, type, text });
    if (type === 'success') {
      setTimeout(() => setMsg((cur) => ({ ...cur, show: false })), 6000);
    }
  }

  function updateCities(nextProv) {
    setProvince(nextProv);
    if (nextProv && MUNICIPALITIES.includes(nextProv)) {
      setCity(nextProv);
    } else {
      setCity('');
    }
  }

  function fillRecord(record) {
    const form = formRef.current;
    const ht = splitHometown(record.hometown);
    setProvince(ht.province);
    setCity(ht.city);
    let dest = record.destination || '';
    if (isInternOrJob(dest)) {
      dest = unitWord;
    }
    setDestination(dest);
    setStudentName(record.studentName || studentName);
    setStudentId(record.studentId || studentId);
    requestAnimationFrame(() => {
      setFormValue(form, 'className', record.className);
      setFormValue(form, 'trainingDirection', record.trainingDirection);
      setFormValue(form, 'gender', record.gender);
      setFormValue(form, 'phone', record.phone);
      setFormValue(form, 'internCompany', record.internCompany);
      setFormValue(form, 'internPosition', record.internPosition);
      setFormValue(form, 'internLocation', record.internLocation);
      setFormValue(form, 'internContact', record.internContact);
      setFormValue(form, 'internContactPhone', record.internContactPhone);
      setFormValue(form, 'businessLine', record.businessLine);
      setFormValue(form, 'internSalary', record.internSalary);
      setFormValue(form, 'internStartDate', record.internStartDate);
      setFormValue(form, 'internEndDate', record.internEndDate);
      setFormValue(form, 'gradSchool', record.gradSchool);
      setFormValue(form, 'gradMajor', record.gradMajor);
      setFormValue(form, 'remark', record.remark);
    });
  }

  function clearDetailFields() {
    const form = formRef.current;
    setDestination('');
    setProvince('');
    setCity('');
    [
      'className', 'trainingDirection', 'gender', 'phone',
      'internCompany', 'internPosition', 'internLocation', 'internContact',
      'internContactPhone', 'businessLine', 'internSalary', 'internStartDate',
      'internEndDate', 'gradSchool', 'gradMajor', 'remark',
    ].forEach((name) => setFormValue(form, name, ''));
  }

  function resetLookup() {
    setLookedUp(false);
    setEditMode(false);
    clearDetailFields();
    setMsg({ show: false, type: '', text: '' });
  }

  function resetForm() {
    formRef.current?.reset();
    setDestination('');
    setProvince('');
    setCity('');
    setStudentName('');
    setStudentId('');
    setLookedUp(false);
    setEditMode(false);
    setMsg({ show: false, type: '', text: '' });
    if (configs.length === 1) setConfigId(String(configs[0].id));
  }

  async function onLookup() {
    const name = studentName.trim();
    const sid = studentId.trim();
    if (!configId) {
      showMsg('请先选择跟踪项目', 'error');
      return;
    }
    if (!name || !sid) {
      showMsg('请填写姓名和学号后再查询', 'error');
      return;
    }
    setQuerying(true);
    try {
      const qs = new URLSearchParams({
        configId: String(configId),
        studentName: name,
        studentId: sid,
      });
      const res = await fetch(withBasePath('/api/student-info/lookup?') + qs.toString(), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);

      setLookedUp(true);
      if (data.found && data.record) {
        setEditMode(true);
        setPendingFill(data.record);
        if (data.nameMismatch) {
          showMsg('该学号已有记录，已载入供修改（姓名与库中不一致）。', 'success');
        } else {
          showMsg('已找到你之前提交的信息，可直接修改后保存。', 'success');
        }
      } else {
        setEditMode(false);
        setPendingFill(null);
        showMsg('未查询到记录，请填写后提交新建。', 'success');
      }
    } catch (err) {
      showMsg('查询失败：' + err.message, 'error');
    } finally {
      setQuerying(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!lookedUp) {
      showMsg('请先用姓名和学号查询', 'error');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    setSubmitting(true);
    btn.textContent = '保存中...';

    try {
      const data = {};
      new FormData(e.target).forEach((v, k) => { data[k] = v; });

      const prov = data.hometownProvince || province || '';
      const cityName = data.hometownCity || city || '';
      delete data.hometownProvince;
      delete data.hometownCity;
      if (MUNICIPALITIES.includes(prov)) {
        data.hometown = prov;
      } else if (prov && cityName) {
        data.hometown = prov + cityName;
      } else if (prov) {
        data.hometown = prov;
      } else {
        data.hometown = '';
      }

      const payload = {
        configId: Number(configId),
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        className: data.className || '',
        hometown: data.hometown || '',
        trainingDirection: data.trainingDirection || '',
        gender: data.gender || '',
        phone: data.phone || '',
        destination: data.destination || destination || '',
        internCompany: data.internCompany || '',
        internLocation: data.internLocation || '',
        internContact: data.internContact || '',
        internContactPhone: data.internContactPhone || '',
        businessLine: data.businessLine || '',
        internPosition: data.internPosition || '',
        internSalary: data.internSalary || '',
        internStartDate: data.internStartDate || '',
        internEndDate: data.internEndDate || '',
        gradSchool: data.gradSchool || '',
        gradMajor: data.gradMajor || '',
        remark: data.remark || '',
      };

      if (!payload.studentName) {
        showMsg('姓名为必填项', 'error');
        return;
      }
      if (!payload.studentId) {
        showMsg('学号为必填项', 'error');
        return;
      }
      if (!payload.className) {
        showMsg('班级为必填项', 'error');
        return;
      }
      if (!prov || !cityName) {
        showMsg('籍贯省份与城市为必填项', 'error');
        return;
      }
      if (!payload.trainingDirection) {
        showMsg('实训方向为必填项', 'error');
        return;
      }
      if (!payload.gender) {
        showMsg('性别为必填项', 'error');
        return;
      }
      if (!payload.phone) {
        showMsg('手机号为必填项', 'error');
        return;
      }
      if (!payload.destination) {
        showMsg('去向为必填项', 'error');
        return;
      }
      if (isInternOrJob(payload.destination)) {
        if (!payload.internCompany) {
          showMsg(`${unitWord}单位名称为必填项`, 'error');
          return;
        }
        if (!payload.internPosition) {
          showMsg(`${unitWord}岗位为必填项`, 'error');
          return;
        }
        if (!payload.internLocation) {
          showMsg(`${unitWord}单位具体地点为必填项`, 'error');
          return;
        }
        if (!payload.internContact) {
          showMsg(`${unitWord}单位联系人为必填项`, 'error');
          return;
        }
        if (!payload.internContactPhone) {
          showMsg(`${unitWord}单位联系人电话为必填项`, 'error');
          return;
        }
        if (!payload.businessLine) {
          showMsg('具体业务线为必填项', 'error');
          return;
        }
        if (!payload.internSalary) {
          showMsg(`${unitWord}薪资为必填项`, 'error');
          return;
        }
        if (!payload.internStartDate) {
          showMsg('入职时间为必填项', 'error');
          return;
        }
        if (!payload.internEndDate) {
          showMsg(`${unitWord}结束时间为必填项`, 'error');
          return;
        }
      } else if (payload.destination === '备考研究生') {
        if (!payload.gradSchool) {
          showMsg('考研目标院校为必填项', 'error');
          return;
        }
        if (!payload.gradMajor) {
          showMsg('目标专业为必填项', 'error');
          return;
        }
      }

      const res = await fetch(withBasePath('/api/student-info'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'HTTP ' + res.status);

      const rec = result.record || {};
      showMsg(
        (result.created ? '新建成功！' : '已更新！') + (rec.studentName || payload.studentName) + ' 的信息已保存。',
        'success'
      );
      if (result.record) {
        setEditMode(true);
        setPendingFill(result.record);
      }
    } catch (err) {
      showMsg('提交失败：' + err.message, 'error');
    } finally {
      setSubmitting(false);
      btn.textContent = editMode ? '保存修改' : '提交登记';
    }
  }

  const cities = province && PROVINCE_CITY[province] ? PROVINCE_CITY[province] : [];
  const locked = lookedUp;

  return (
    <div className="container">
      <div className="hero">
        <h1>
          {selectedConfig ? selectedConfig.title : '实习就业数据跟踪'}
          {selectedConfig ? <span className={`type-tag ${configType === '就业' ? 'job' : 'intern'}`}>{configType}</span> : null}
        </h1>
        <p>请先选择跟踪项目，再用姓名和学号查询。查到则修改以往记录，查不到则新建。未启用的项目不会出现。带 * 为必填。</p>
      </div>
      <div id="msg" className={msg.show ? `msg show ${msg.type}` : 'msg'}>{msg.text}</div>
      <form id="form" ref={formRef} onSubmit={onSubmit}>
        <div className="card">
          <div className="card-title">身份核对</div>
          <div className="form-grid">
            <div className="form-group full">
              <label>跟踪项目 <span className="req">*</span></label>
              <select
                value={configId}
                onChange={(e) => {
                  const nextCid = e.target.value;
                  setConfigId(nextCid);
                  resetLookup();
                  const nextCfg = configs.find((c) => String(c.id) === String(nextCid));
                  const nextUnit = nextCfg && nextCfg.type === '就业' ? '就业' : '实习';
                  if (isInternOrJob(destination)) {
                    setDestination(nextUnit);
                  }
                }}
                required
                disabled={locked}
              >
                <option value="">请选择</option>
                {configs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>姓名 <span className="req">*</span></label>
              <input
                name="studentName"
                required
                placeholder="你的姓名"
                value={studentName}
                readOnly={locked}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>学号 <span className="req">*</span></label>
              <input
                name="studentId"
                required
                placeholder="如：2315030101"
                value={studentId}
                readOnly={locked}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            {locked ? (
              <button type="button" className="btn btn-ghost" onClick={resetLookup}>重新查询</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onLookup} disabled={querying}>
                {querying ? '查询中...' : '查询'}
              </button>
            )}
          </div>
        </div>

        {lookedUp ? (
          <>
            <div className={editMode ? 'mode-tag edit' : 'mode-tag new'}>
              {editMode ? '编辑已有记录' : '新建登记'}
            </div>

            <div className="card">
              <div className="card-title">基本信息</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>班级 <span className="req">*</span></label>
                  <select name="className" required>
                    <option value="">请选择</option>
                    <option value="一班">一班</option>
                    <option value="二班">二班</option>
                    <option value="三班">三班</option>
                    <option value="四班">四班</option>
                    <option value="五班">五班</option>
                    <option value="六班">六班</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>籍贯 - 省份 <span className="req">*</span></label>
                  <select
                    name="hometownProvince"
                    required
                    value={province}
                    onChange={(e) => updateCities(e.target.value)}
                  >
                    {PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>籍贯 - 城市 <span className="req">*</span></label>
                  <select
                    name="hometownCity"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    <option value="">请选择城市</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>实训方向 <span className="req">*</span></label>
                  <select name="trainingDirection" required>
                    <option value="">请选择</option>
                    <option value="前端实训1-3班">前端实训1-3班</option>
                    <option value="前端实训4-6班">前端实训4-6班</option>
                    <option value="后端实训">后端实训</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>性别 <span className="req">*</span></label>
                  <select name="gender" required>
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div className="form-group full">
                  <label>手机号 <span className="req">*</span></label>
                  <input name="phone" required placeholder="如：19169967829" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">去向</div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>去向 <span className="req">*</span></label>
                <select
                  name="destination"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="">请选择</option>
                  <option value={unitWord}>{unitWord}</option>
                  <option value="待实习">待实习</option>
                  <option value="备考研究生">备考研究生</option>
                  <option value="备考公务员">备考公务员</option>
                </select>
              </div>
            </div>

            <div className="card" id="internCard" style={{ display: isInternOrJob(destination) ? 'block' : 'none' }}>
              <div className="card-title">{unitWord}信息</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>{unitWord}单位名称 <span className="req">*</span></label>
                  <input name="internCompany" required={isInternOrJob(destination)} placeholder="如：科大讯飞" />
                </div>
                <div className="form-group">
                  <label>{unitWord}岗位 <span className="req">*</span></label>
                  <input name="internPosition" required={isInternOrJob(destination)} placeholder={configType === '就业' ? '如：Java开发工程师' : '如：Java开发实习生'} />
                </div>
                <div className="form-group full">
                  <label>{unitWord}单位具体地点 <span className="req">*</span></label>
                  <input name="internLocation" required={isInternOrJob(destination)} placeholder="精确到具体门牌号，如：上海市浦东新区张江高科川和路55弄" />
                </div>
                <div className="form-group">
                  <label>{unitWord}单位联系人 <span className="req">*</span></label>
                  <input name="internContact" required={isInternOrJob(destination)} placeholder="如：代思曼" />
                </div>
                <div className="form-group">
                  <label>{unitWord}单位联系人电话 <span className="req">*</span></label>
                  <input name="internContactPhone" required={isInternOrJob(destination)} placeholder="如：18817774509" />
                </div>
                <div className="form-group">
                  <label>具体业务线 <span className="req">*</span></label>
                  <input name="businessLine" required={isInternOrJob(destination)} placeholder="如：七牛云暑期实训营" />
                </div>
                <div className="form-group">
                  <label>{unitWord}薪资 <span className="req">*</span></label>
                  <input name="internSalary" required={isInternOrJob(destination)} placeholder="如：300/天 或 5000/月" />
                </div>
                <div className="form-group">
                  <label>入职时间 <span className="req">*</span></label>
                  <input name="internStartDate" required={isInternOrJob(destination)} placeholder="如：7.06" />
                </div>
                <div className="form-group">
                  <label>{unitWord}结束时间 <span className="req">*</span></label>
                  <input name="internEndDate" required={isInternOrJob(destination)} placeholder="如：9.06" />
                </div>
              </div>
            </div>

            <div className="card" id="gradCard" style={{ display: destination === '备考研究生' ? 'block' : 'none' }}>
              <div className="card-title">考研信息</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>考研目标院校 <span className="req">*</span></label>
                  <input name="gradSchool" required={destination === '备考研究生'} placeholder="如：中国科学技术大学" />
                </div>
                <div className="form-group">
                  <label>目标专业 <span className="req">*</span></label>
                  <input name="gradMajor" required={destination === '备考研究生'} placeholder="如：计算机科学与技术" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">备注</div>
              <div className="form-group">
                <textarea name="remark" rows="3" placeholder="其他需要说明的信息（选填）" />
              </div>
            </div>

            <div className="actions">
              <button type="button" className="btn btn-ghost" onClick={resetForm}>清空</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {editMode ? '保存修改' : '提交登记'}
              </button>
            </div>
          </>
        ) : null}
      </form>
    </div>
  );
}
