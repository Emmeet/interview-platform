'use client';

import { useEffect, useRef, useState } from 'react';
import { MUNICIPALITIES, PROVINCE_CITY } from '../lib/region-data';
import { withBasePath } from '../lib/base-path';
import {
  INTERN_DEST_LABEL,
  TRAINING_OPTIONS,
  analyzeSalary,
  canonicalDestination,
  isInternDestination,
  parseHometown,
  salaryDisplay,
} from '../lib/intern-fields';
import {
  EMPLOYMENT_DESTINATIONS,
  EMPLOYMENT_SERVICE_DESTINATIONS,
  canonicalEmploymentDestination,
  employmentFieldError,
  isEmploymentCompanyDestination,
  isEmploymentSuccessDestination,
} from '../lib/employment-fields.js';

const PROVINCES = Object.keys(PROVINCE_CITY);
const YES_NO_OPTIONS = ['是', '否'];
const SERVICE_OPTGROUP_LABEL = '参军 / 自主创业';
const EMPLOYMENT_DEST_VALUE_SET = new Set([
  ...EMPLOYMENT_DESTINATIONS.map((item) => item.value),
  ...EMPLOYMENT_SERVICE_DESTINATIONS.map((item) => item.value),
]);
const DETAIL_FIELD_NAMES = [
  'className', 'trainingDirection', 'gender', 'phone',
  'internCompany', 'internPosition', 'internLocation', 'internContact',
  'internContactPhone', 'businessLine', 'internSalary', 'internStartDate',
  'internEndDate', 'gradSchool', 'gradMajor', 'remark',
  'employmentProvince', 'employmentCity', 'sameInternCompany', 'sameInternPosition',
];

function setFormValue(form, name, value) {
  if (form && form.elements[name]) form.elements[name].value = value || '';
}

function pickBasic(record) {
  if (!record || typeof record !== 'object') return null;
  return {
    studentName: record.studentName || '',
    studentId: record.studentId || '',
    className: record.className || '',
    hometown: record.hometown || '',
    trainingDirection: record.trainingDirection || '',
    gender: record.gender || '',
    phone: record.phone || '',
  };
}

function displayValue(value) {
  const text = String(value || '').trim();
  return text || '—';
}

function BasicInfoFields({ province, city, cities, onProvinceChange, onCityChange }) {
  return (
    <div className="form-grid">
      <div className="form-group">
        <label htmlFor="className">班级 <span className="req">*</span></label>
        <select id="className" name="className" required>
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
        <label htmlFor="hometownProvince">籍贯 - 省份 <span className="req">*</span></label>
        <select
          id="hometownProvince"
          name="hometownProvince"
          required
          value={province}
          onChange={(e) => onProvinceChange(e.target.value)}
        >
          <option value="">请选择省份</option>
          {PROVINCES.map((prov) => (
            <option key={prov} value={prov}>{prov}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="hometownCity">籍贯 - 城市 <span className="req">*</span></label>
        <select
          id="hometownCity"
          name="hometownCity"
          required
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
        >
          <option value="">请选择城市</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="trainingDirection">实训方向 <span className="req">*</span></label>
        <select id="trainingDirection" name="trainingDirection" required>
          <option value="">请选择</option>
          {TRAINING_OPTIONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="gender">性别 <span className="req">*</span></label>
        <select id="gender" name="gender" required>
          <option value="">请选择</option>
          <option value="男">男</option>
          <option value="女">女</option>
        </select>
      </div>
      <div className="form-group full">
        <label htmlFor="phone">手机号 <span className="req">*</span></label>
        <input id="phone" name="phone" required placeholder="如：19169967829" />
      </div>
    </div>
  );
}

function BasicInfoSummary({ info }) {
  return (
    <div className="form-grid">
      <div className="form-group">
        <label>班级</label>
        <div>{displayValue(info.className)}</div>
      </div>
      <div className="form-group">
        <label>籍贯</label>
        <div>{displayValue(info.hometown)}</div>
      </div>
      <div className="form-group">
        <label>实训方向</label>
        <div>{displayValue(info.trainingDirection)}</div>
      </div>
      <div className="form-group">
        <label>性别</label>
        <div>{displayValue(info.gender)}</div>
      </div>
      <div className="form-group full">
        <label>手机号</label>
        <div>{displayValue(info.phone)}</div>
      </div>
    </div>
  );
}

function InternshipReference({ internshipRef }) {
  const hint = internshipRef
    ? `同届实习参考（${internshipRef.configTitle || '实习项目'}）：单位 ${internshipRef.internCompany || '（未填写）'}，岗位 ${internshipRef.internPosition || '（未填写）'}`
    : '暂无同届实习单位/岗位记录可对照，请按实际情况选择是否一致。';
  return <div className="field-hint" id="internshipRefHint">{hint}</div>;
}

function FlagSelect({ id, name, label, required, value, onChange, describedBy }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req"> *</span> : null}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">请选择</option>
        {YES_NO_OPTIONS.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  );
}


export default function StudentInfoForm() {
  const formRef = useRef(null);
  const messageTimer = useRef(null);
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
  const [salaryText, setSalaryText] = useState('');
  const [extraCity, setExtraCity] = useState('');
  const [inherited, setInherited] = useState(null);
  const [internshipRef, setInternshipRef] = useState(null);
  const [empCompany, setEmpCompany] = useState('');
  const [empPosition, setEmpPosition] = useState('');
  const [empGradSchool, setEmpGradSchool] = useState('');
  const [empGradMajor, setEmpGradMajor] = useState('');
  const [employmentProvince, setEmploymentProvince] = useState('');
  const [employmentCity, setEmploymentCity] = useState('');
  const [sameInternCompany, setSameInternCompany] = useState('');
  const [sameInternPosition, setSameInternPosition] = useState('');

  const selectedConfig = configs.find((c) => String(c.id) === String(configId));
  const configType = selectedConfig && selectedConfig.type === '就业' ? '就业' : '实习';
  const isEmployment = configType === '就业';
  const salaryInfo = analyzeSalary(salaryText);
  const employmentDest = isEmployment ? canonicalEmploymentDestination(destination) : '';
  const companyDest = isEmploymentCompanyDestination(employmentDest);
  const successDest = isEmploymentSuccessDestination(employmentDest);
  const workingDest = employmentDest === '就业上岗';

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

  useEffect(() => () => clearTimeout(messageTimer.current), []);

  function showMsg(text, type) {
    clearTimeout(messageTimer.current);
    setMsg({ show: true, type, text });
    if (type === 'success') {
      messageTimer.current = setTimeout(() => setMsg((cur) => ({ ...cur, show: false })), 6000);
    }
  }

  function updateCities(nextProv) {
    setProvince(nextProv);
    setExtraCity('');
    if (nextProv && MUNICIPALITIES.includes(nextProv)) {
      setCity(nextProv);
    } else {
      setCity('');
    }
  }

  function updateEmploymentCities(nextProv) {
    setEmploymentProvince(nextProv);
    if (nextProv && MUNICIPALITIES.includes(nextProv)) {
      setEmploymentCity(nextProv);
    } else {
      setEmploymentCity('');
    }
  }

  function clearEmploymentBranch({ keepCompany, keepSuccess } = {}) {
    if (!keepCompany) {
      setEmpCompany('');
      setEmpPosition('');
      setSalaryText('');
      setEmploymentProvince('');
      setEmploymentCity('');
      setSameInternCompany('');
      setSameInternPosition('');
    }
    if (!keepSuccess) {
      setEmpGradSchool('');
      setEmpGradMajor('');
    }
  }

  function onEmploymentDestinationChange(next) {
    const nextCompany = isEmploymentCompanyDestination(next);
    const nextSuccess = isEmploymentSuccessDestination(next);
    setDestination(next);
    clearEmploymentBranch({
      keepCompany: nextCompany,
      keepSuccess: nextSuccess,
    });
  }

  function fillEmployment(record) {
    const candidate = canonicalEmploymentDestination(record.destination || '');
    const dest = EMPLOYMENT_DEST_VALUE_SET.has(candidate) ? candidate : '';
    const company = isEmploymentCompanyDestination(dest);
    const success = isEmploymentSuccessDestination(dest);
    const prov = company && PROVINCE_CITY[record.employmentProvince] ? record.employmentProvince : '';
    const recCity = record.employmentCity || '';
    setDestination(dest);
    setSalaryText(company ? record.internSalary || '' : '');
    setEmpCompany(company ? record.internCompany || '' : '');
    setEmpPosition(company ? record.internPosition || '' : '');
    setEmpGradSchool(success ? record.gradSchool || '' : '');
    setEmpGradMajor(success ? record.gradMajor || '' : '');
    setEmploymentProvince(prov);
    setEmploymentCity(prov && MUNICIPALITIES.includes(prov)
      ? prov : (PROVINCE_CITY[prov]?.includes(recCity) ? recCity : ''));
    setSameInternCompany(company && YES_NO_OPTIONS.includes(record.sameInternCompany) ? record.sameInternCompany : '');
    setSameInternPosition(company && YES_NO_OPTIONS.includes(record.sameInternPosition) ? record.sameInternPosition : '');
    setStudentName(record.studentName || studentName);
    setStudentId(record.studentId || studentId);
  }

  function fillIntern(record) {
    const form = formRef.current;
    const ht = parseHometown(record.hometown);
    setProvince(ht.province);
    setCity(ht.city);
    setExtraCity(ht.city);
    const dest = canonicalDestination(record.destination || '');
    setDestination(dest);
    setSalaryText(record.internSalary || '');
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
      setFormValue(form, 'internStartDate', record.internStartDate);
      setFormValue(form, 'internEndDate', record.internEndDate);
      setFormValue(form, 'gradSchool', record.gradSchool);
      setFormValue(form, 'gradMajor', record.gradMajor);
      setFormValue(form, 'remark', record.remark);
    });
  }

  function fillRecord(record) {
    if (configType === '就业') {
      fillEmployment(record);
      return;
    }
    fillIntern(record);
  }

  function clearDetailFields() {
    const form = formRef.current;
    setDestination('');
    setProvince('');
    setCity('');
    setSalaryText('');
    setExtraCity('');
    setInherited(null);
    setInternshipRef(null);
    clearEmploymentBranch();
    DETAIL_FIELD_NAMES.forEach((name) => setFormValue(form, name, ''));
  }

  function resetLookup() {
    setLookedUp(false);
    setEditMode(false);
    setPendingFill(null);
    clearDetailFields();
    setMsg({ show: false, type: '', text: '' });
  }

  function resetForm() {
    formRef.current?.reset();
    setDestination('');
    setProvince('');
    setCity('');
    setSalaryText('');
    setExtraCity('');
    setStudentName('');
    setStudentId('');
    setLookedUp(false);
    setEditMode(false);
    setPendingFill(null);
    setInherited(null);
    setInternshipRef(null);
    clearEmploymentBranch();
    setMsg({ show: false, type: '', text: '' });
    if (configs.length === 1) setConfigId(String(configs[0].id));
  }

  async function onLookup() {
    if (querying || submitting) return;
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
      setInternshipRef(isEmployment ? (data.internship || null) : null);
      if (data.found && data.record) {
        setEditMode(true);
        setInherited(isEmployment ? pickBasic(data.record) : null);
        setPendingFill(data.record);
        if (data.nameMismatch) {
          showMsg('该学号已有记录，已载入供修改（姓名与库中不一致）。', 'success');
        } else {
          showMsg('已找到你之前提交的信息，可直接修改后保存。', 'success');
        }
      } else if (isEmployment && data.prefill) {
        setEditMode(false);
        setInherited(pickBasic(data.prefill));
        setPendingFill(null);
        showMsg('未查询到就业记录，已带入同届实习基本信息，请选择去向后提交新建。', 'success');
      } else {
        setEditMode(false);
        setInherited(null);
        setPendingFill(null);
        if (isEmployment) {
          showMsg('未查询到就业记录，也未找到同届实习基本信息，请手工填写基本信息后提交新建。', 'success');
        } else {
          showMsg('未查询到记录，请填写后提交新建。', 'success');
        }
      }
    } catch (err) {
      showMsg('查询失败：' + err.message, 'error');
    } finally {
      setQuerying(false);
    }
  }

  function internPayloadError(payload, prov, cityName) {
    if (!payload.studentName) return '姓名为必填项';
    if (!payload.studentId) return '学号为必填项';
    if (!payload.className) return '班级为必填项';
    if (!prov || !cityName) return '籍贯省份与城市为必填项';
    if (!payload.trainingDirection) return '实训方向为必填项';
    if (!payload.gender) return '性别为必填项';
    if (!payload.phone) return '手机号为必填项';
    if (!payload.destination) return '去向为必填项';
    if (isInternDestination(payload.destination)) {
      if (!payload.internCompany) return '实习单位名称为必填项';
      if (!payload.internPosition) return '实习岗位为必填项';
      if (!payload.internLocation) return '实习单位具体地点为必填项';
      if (!payload.internContact) return '实习单位联系人为必填项';
      if (!payload.internContactPhone) return '实习单位联系人电话为必填项';
      if (!payload.businessLine) return '具体业务线为必填项';
      if (!payload.internSalary) return '实习薪资为必填项';
      if (!payload.internStartDate) return '实习入职时间为必填项';
      if (!payload.internEndDate) return '实习结束时间为必填项';
    } else if (payload.destination === '备考研究生') {
      if (!payload.gradSchool) return '考研目标院校为必填项';
      if (!payload.gradMajor) return '目标专业为必填项';
    }
    return '';
  }

  function employmentBasicError(payload, prov, cityName) {
    if (!payload.studentName) return '姓名为必填项';
    if (!payload.studentId) return '学号为必填项';
    if (inherited) return '';
    if (!payload.className) return '班级为必填项';
    if (!prov || !cityName) return '籍贯省份与城市为必填项';
    if (!payload.trainingDirection) return '实训方向为必填项';
    if (!payload.gender) return '性别为必填项';
    if (!payload.phone) return '手机号为必填项';
    return '';
  }

  function buildHometown(data, fallbackProv, fallbackCity) {
    const prov = data.hometownProvince || fallbackProv || '';
    const cityName = data.hometownCity || fallbackCity || '';
    let hometown = '';
    if (MUNICIPALITIES.includes(prov)) {
      hometown = prov;
    } else if (prov && cityName) {
      hometown = prov + cityName;
    } else if (prov) {
      hometown = prov;
    }
    return { prov, cityName, hometown };
  }

  function buildEmploymentPayload(data) {
    const dest = canonicalEmploymentDestination(data.destination || destination || '');
    const isCompany = isEmploymentCompanyDestination(dest);
    const isSuccess = isEmploymentSuccessDestination(dest);
    const basic = inherited || {};
    const hometownInfo = inherited
      ? { hometown: inherited.hometown || '' }
      : buildHometown(data, province, city);
    const salary = isCompany ? salaryDisplay(salaryText || data.internSalary || '') : '';
    const payload = {
      configId: Number(configId),
      studentName: studentName.trim(),
      studentId: studentId.trim(),
      className: inherited ? (basic.className || '') : (data.className || ''),
      hometown: hometownInfo.hometown,
      trainingDirection: inherited ? (basic.trainingDirection || '') : (data.trainingDirection || ''),
      gender: inherited ? (basic.gender || '') : (data.gender || ''),
      phone: inherited ? (basic.phone || '') : (data.phone || ''),
      destination: dest,
      internCompany: isCompany ? (empCompany || data.internCompany || '').trim() : '',
      internLocation: '',
      internContact: '',
      internContactPhone: '',
      businessLine: '',
      internPosition: isCompany ? (empPosition || data.internPosition || '').trim() : '',
      internSalary: salary,
      internStartDate: '',
      internEndDate: '',
      gradSchool: isSuccess ? (empGradSchool || data.gradSchool || '').trim() : '',
      gradMajor: isSuccess ? (empGradMajor || data.gradMajor || '').trim() : '',
      remark: data.remark || '',
      employmentProvince: isCompany ? (employmentProvince || data.employmentProvince || '') : '',
      employmentCity: isCompany ? (employmentCity || data.employmentCity || '') : '',
      sameInternCompany: isCompany ? (sameInternCompany || data.sameInternCompany || '') : '',
      sameInternPosition: isCompany ? (sameInternPosition || data.sameInternPosition || '') : '',
    };
    return { payload, hometownInfo };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!lookedUp) {
      showMsg('请先用姓名和学号查询', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const data = {};
      new FormData(e.target).forEach((v, k) => { data[k] = v; });

      let payload;
      if (isEmployment) {
        const built = buildEmploymentPayload(data);
        payload = built.payload;
        const basicErr = employmentBasicError(payload, built.hometownInfo.prov, built.hometownInfo.cityName);
        if (basicErr) {
          showMsg(basicErr, 'error');
          return;
        }
        const empErr = employmentFieldError(payload);
        if (empErr) {
          showMsg(empErr, 'error');
          return;
        }
      } else {
        const hometownInfo = buildHometown(data, province, city);
        payload = {
          configId: Number(configId),
          studentName: studentName.trim(),
          studentId: studentId.trim(),
          className: data.className || '',
          hometown: hometownInfo.hometown,
          trainingDirection: data.trainingDirection || '',
          gender: data.gender || '',
          phone: data.phone || '',
          destination: canonicalDestination(data.destination || destination || ''),
          internCompany: data.internCompany || '',
          internLocation: data.internLocation || '',
          internContact: data.internContact || '',
          internContactPhone: data.internContactPhone || '',
          businessLine: data.businessLine || '',
          internPosition: data.internPosition || '',
          internSalary: salaryDisplay(data.internSalary || ''),
          internStartDate: data.internStartDate || '',
          internEndDate: data.internEndDate || '',
          gradSchool: data.gradSchool || '',
          gradMajor: data.gradMajor || '',
          remark: data.remark || '',
        };
        const internErr = internPayloadError(payload, hometownInfo.prov, hometownInfo.cityName);
        if (internErr) {
          showMsg(internErr, 'error');
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
        setInherited(isEmployment ? pickBasic(result.record) : null);
        setPendingFill(result.record);
      }
    } catch (err) {
      showMsg('提交失败：' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const baseCities = province && PROVINCE_CITY[province] ? PROVINCE_CITY[province] : [];
  const cities = extraCity && province && !baseCities.includes(extraCity) ? [...baseCities, extraCity] : baseCities;
  const empBaseCities = employmentProvince && PROVINCE_CITY[employmentProvince] ? PROVINCE_CITY[employmentProvince] : [];
  const empCities = empBaseCities;
  const locked = lookedUp;
  const salaryHint = (
    <>
      日薪按 22 个工作日折成月薪后保存。
      {salaryText.trim() && salaryInfo.monthly != null && salaryInfo.display !== salaryText.trim()
        ? ` 将保存为 ${salaryInfo.display}`
        : ''}
    </>
  );

  return (
    <div className="container">
      <div className="hero">
        <h1>
          {selectedConfig ? selectedConfig.title : '实习就业数据跟踪'}
          {selectedConfig ? <span className={`type-tag ${configType === '就业' ? 'job' : 'intern'}`}>{configType}</span> : null}
        </h1>
        <p>请先选择跟踪项目，再用姓名和学号查询。查到则修改以往记录，查不到则新建。未启用的项目不会出现。带 * 为必填。</p>
      </div>
      <div
        id="msg"
        className={msg.show ? `msg show ${msg.type}` : 'msg'}
        role={msg.type === 'error' ? 'alert' : 'status'}
        aria-live={msg.type === 'error' ? 'assertive' : 'polite'}
      >
        {msg.text}
      </div>
      <form id="form" ref={formRef} onSubmit={onSubmit}>
        <div className="card">
          <div className="card-title">身份核对</div>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="configId">跟踪项目 <span className="req">*</span></label>
              <select
                id="configId"
                value={configId}
                onChange={(e) => {
                  const nextCid = e.target.value;
                  setConfigId(nextCid);
                  resetLookup();
                }}
                required
                disabled={locked || querying || submitting}
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
              <label htmlFor="studentName">姓名 <span className="req">*</span></label>
              <input
                id="studentName"
                name="studentName"
                required
                placeholder="你的姓名"
                value={studentName}
                readOnly={locked || querying || submitting}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="studentId">学号 <span className="req">*</span></label>
              <input
                id="studentId"
                name="studentId"
                required
                placeholder="如：2315030101"
                value={studentId}
                readOnly={locked || querying || submitting}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            {locked ? (
              <button type="button" className="btn btn-ghost" onClick={resetLookup} disabled={querying || submitting}>重新查询</button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onLookup}
                disabled={querying || submitting}
                aria-busy={querying}
              >
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
              {isEmployment && inherited ? (
                <>
                  <p className="field-hint">已带入同届实习或已有登记中的基本信息，无需重复填写。</p>
                  <BasicInfoSummary info={inherited} />
                </>
              ) : (
                <>
                  {isEmployment ? (
                    <p className="field-hint">未找到同届实习登记，请手工填写基本信息。带 * 为必填。</p>
                  ) : null}
                  <BasicInfoFields
                    province={province}
                    city={city}
                    cities={cities}
                    onProvinceChange={updateCities}
                    onCityChange={setCity}
                  />
                </>
              )}
            </div>

            {isEmployment ? (
              <div className="card">
                <div className="card-title">去向</div>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label htmlFor="destination">去向 <span className="req">*</span></label>
                  <select
                    id="destination"
                    name="destination"
                    required
                    value={destination}
                    onChange={(e) => onEmploymentDestinationChange(e.target.value)}
                  >
                    <option value="">请选择</option>
                    {EMPLOYMENT_DESTINATIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                    <optgroup label={SERVICE_OPTGROUP_LABEL}>
                      {EMPLOYMENT_SERVICE_DESTINATIONS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-title">去向</div>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label htmlFor="destination">去向 <span className="req">*</span></label>
                  <select
                    id="destination"
                    name="destination"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  >
                    <option value="">请选择</option>
                    <option value={INTERN_DEST_LABEL}>{INTERN_DEST_LABEL}</option>
                    <option value="待实习">待实习</option>
                    <option value="备考研究生">备考研究生</option>
                    <option value="备考公务员">备考公务员</option>
                  </select>
                </div>
              </div>
            )}

            {isEmployment && companyDest ? (
              <div className="card" id="employmentCard">
                <div className="card-title">就业信息</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="internCompany">单位名称 <span className="req">*</span></label>
                    <input
                      id="internCompany"
                      name="internCompany"
                      required
                      placeholder="如：科大讯飞"
                      value={empCompany}
                      onChange={(e) => setEmpCompany(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="internPosition">岗位名称 <span className="req">*</span></label>
                    <input
                      id="internPosition"
                      name="internPosition"
                      required
                      placeholder="如：Java开发"
                      value={empPosition}
                      onChange={(e) => setEmpPosition(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="internSalary">
                      岗位薪资
                      {workingDest ? <span className="req"> *</span> : null}
                    </label>
                    <input
                      id="internSalary"
                      name="internSalary"
                      required={workingDest}
                      placeholder="如：300/天 或 8000/月"
                      value={salaryText}
                      aria-describedby="empSalaryHint"
                      onChange={(e) => setSalaryText(e.target.value)}
                    />
                    <div className="field-hint" id="empSalaryHint">{salaryHint}</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="employmentProvince">
                      单位省份
                      {workingDest ? <span className="req"> *</span> : null}
                    </label>
                    <select
                      id="employmentProvince"
                      name="employmentProvince"
                      required={workingDest}
                      value={employmentProvince}
                      onChange={(e) => updateEmploymentCities(e.target.value)}
                    >
                      <option value="">请选择省份</option>
                      {PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="employmentCity">
                      单位城市
                      {workingDest ? <span className="req"> *</span> : null}
                    </label>
                    <select
                      id="employmentCity"
                      name="employmentCity"
                      required={workingDest}
                      value={employmentCity}
                      onChange={(e) => setEmploymentCity(e.target.value)}
                    >
                      <option value="">请选择城市</option>
                      {empCities.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full">
                    <InternshipReference internshipRef={internshipRef} />
                  </div>
                  <FlagSelect
                    id="sameInternCompany"
                    name="sameInternCompany"
                    label="与实习单位是否一致"
                    required={workingDest}
                    value={sameInternCompany}
                    describedBy="internshipRefHint"
                    onChange={setSameInternCompany}
                  />
                  <FlagSelect
                    id="sameInternPosition"
                    name="sameInternPosition"
                    label="与实习岗位是否一致"
                    required={workingDest}
                    value={sameInternPosition}
                    describedBy="internshipRefHint"
                    onChange={setSameInternPosition}
                  />
                </div>
              </div>
            ) : null}

            {isEmployment && successDest ? (
              <div className="card" id="admissionCard">
                <div className="card-title">录取信息</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="gradSchool">上岸单位/院校 <span className="req">*</span></label>
                    <input
                      id="gradSchool"
                      name="gradSchool"
                      required
                      placeholder="如：中国科学技术大学"
                      value={empGradSchool}
                      onChange={(e) => setEmpGradSchool(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gradMajor">岗位/专业 <span className="req">*</span></label>
                    <input
                      id="gradMajor"
                      name="gradMajor"
                      required
                      placeholder="如：计算机科学与技术"
                      value={empGradMajor}
                      onChange={(e) => setEmpGradMajor(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {!isEmployment ? (
              <div className="card" id="internCard" style={{ display: isInternDestination(destination) ? 'block' : 'none' }}>
                <div className="card-title">实习信息</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="internCompany">实习单位名称 <span className="req">*</span></label>
                    <input id="internCompany" name="internCompany" required={isInternDestination(destination)} placeholder="如：科大讯飞" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="internPosition">实习岗位 <span className="req">*</span></label>
                    <input id="internPosition" name="internPosition" required={isInternDestination(destination)} placeholder="如：Java开发实习生" />
                  </div>
                  <div className="form-group full">
                    <label htmlFor="internLocation">实习单位具体地点 <span className="req">*</span></label>
                    <input id="internLocation" name="internLocation" required={isInternDestination(destination)} placeholder="精确到具体门牌号，如：上海市浦东新区张江高科川和路55弄" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="internContact">实习单位联系人 <span className="req">*</span></label>
                    <input id="internContact" name="internContact" required={isInternDestination(destination)} placeholder="如：代思曼" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="internContactPhone">实习单位联系人电话 <span className="req">*</span></label>
                    <input id="internContactPhone" name="internContactPhone" required={isInternDestination(destination)} placeholder="如：18817774509" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="businessLine">具体业务线 <span className="req">*</span></label>
                    <input id="businessLine" name="businessLine" required={isInternDestination(destination)} placeholder="如：七牛云暑期实训营" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="internSalary">实习薪资 <span className="req">*</span></label>
                    <input
                      id="internSalary"
                      name="internSalary"
                      required={isInternDestination(destination)}
                      placeholder="如：300/天 或 5000/月"
                      value={salaryText}
                      aria-describedby="internSalaryHint"
                      onChange={(e) => setSalaryText(e.target.value)}
                    />
                    <div className="field-hint" id="internSalaryHint">{salaryHint}</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="internStartDate">实习入职时间 <span className="req">*</span></label>
                    <input id="internStartDate" name="internStartDate" required={isInternDestination(destination)} placeholder="如：7.06" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="internEndDate">实习结束时间 <span className="req">*</span></label>
                    <input id="internEndDate" name="internEndDate" required={isInternDestination(destination)} placeholder="如：9.06" />
                  </div>
                </div>
              </div>
            ) : null}

            {!isEmployment ? (
              <div className="card" id="gradCard" style={{ display: destination === '备考研究生' ? 'block' : 'none' }}>
                <div className="card-title">考研信息</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="gradSchool">考研目标院校 <span className="req">*</span></label>
                    <input id="gradSchool" name="gradSchool" required={destination === '备考研究生'} placeholder="如：中国科学技术大学" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gradMajor">目标专业 <span className="req">*</span></label>
                    <input id="gradMajor" name="gradMajor" required={destination === '备考研究生'} placeholder="如：计算机科学与技术" />
                  </div>
                </div>
              </div>
            ) : null}

            {!isEmployment ? (
              <div className="card">
                <div className="card-title">备注</div>
                <div className="form-group">
                  <label htmlFor="remark" className="hint">备注</label>
                  <textarea id="remark" name="remark" rows="3" placeholder="其他需要说明的信息（选填）" />
                </div>
              </div>
            ) : null}

            <div className="actions">
              <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={querying || submitting}>清空</button>
              <button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>
                {submitting ? '保存中...' : (editMode ? '保存修改' : '提交登记')}
              </button>
            </div>
          </>
        ) : null}
      </form>
    </div>
  );
}
