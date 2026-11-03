'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { withBasePath } from '../lib/base-path';
import {
  INTERN_DEST_LABEL,
  TRAINING_OPTIONS,
  SALARY_BUCKETS,
  analyzeSalary,
  canonicalDestination,
  salaryDisplay,
  inferWorkPlace,
  isInternDestination,
  parseStudentSheet,
  salaryBucket,
  topWorkPlaces,
} from '../lib/intern-fields';
import ImportFeedback from './ImportFeedback';
import { readImportWorkbook } from '../lib/import-workbook';
import { createLabeledChart } from '../lib/chart-value-labels';
import { JOB_CATEGORY_OPTIONS as CATEGORY_OPTIONS, assessRecord, describeRules, deriveSopStatus } from '../lib/assessment';
import {
  COMPANY_CATEGORY_OPTIONS,
  EMPLOYMENT_DESTINATIONS,
  EMPLOYMENT_SERVICE_DESTINATIONS,
  canonicalEmploymentDestination,
  isEmploymentCompanyDestination,
  isEmploymentSuccessDestination,
} from '../lib/employment-fields';
const STATUS_OPTIONS = ['待判定', '是', '否'];
const DEST_STACK_LABELS = ['已实习', '备考研究生', '备考公务员', '待实习'];
const DEST_STACK_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#94a3b8'];
const MATCH_CATEGORIES = new Set(['SOP类IT岗位', '非SOP类IT岗位']);
const JOB_CATEGORY_COLORS = {
  'SOP类IT岗位': '#2563eb',
  '非SOP类IT岗位': '#0ea5e9',
  'IT企业的非IT岗位': '#8b5cf6',
  '其它岗位': '#94a3b8',
  '自主创业': '#f59e0b',
  '升学、公职类': '#10b981',
  '待判定': '#cbd5e1',
};
const SALARY_COLORS = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a', '#94a3b8'];

/* --------------------------------------------------------------------------
   Demo / Fallback Sample Data (for preview when database is offline/empty)
   -------------------------------------------------------------------------- */
const DEMO_CONFIGS = [
  { id: 'demo-1', title: '2026届计算机科学与技术专业实习就业跟踪', type: '实习', isActive: true },
  { id: 'demo-2', title: '2025届毕业生去向数据跟踪', type: '就业', isActive: true },
];

const DEMO_RECORDS = [
  {
    id: 101,
    studentName: '张梓轩',
    studentId: '20220101',
    className: '一班',
    hometown: '吉林省长春市',
    trainingDirection: TRAINING_OPTIONS[0],
    gender: '男',
    phone: '13812345678',
    destination: '已找到实习单位',
    internCompany: '北京字节跳动科技有限公司',
    internLocation: '北京市海淀区紫金数码园',
    internContact: '刘主管',
    internContactPhone: '010-88886666',
    businessLine: '抖音电商核心前端',
    internPosition: '前端开发工程师',
    internSalary: '8000',
    internStartDate: '2026-03-01',
    internEndDate: '2026-08-31',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '是',
  },
  {
    id: 102,
    studentName: '李雨涵',
    studentId: '20220102',
    className: '一班',
    hometown: '黑龙江省哈尔滨市',
    trainingDirection: TRAINING_OPTIONS[0],
    gender: '女',
    phone: '13923456789',
    destination: '已找到实习单位',
    internCompany: '美团科技有限公司',
    internLocation: '北京市朝阳区望京东路',
    internContact: '王经理',
    internContactPhone: '010-66668888',
    businessLine: '美团到店综合前端',
    internPosition: 'Web前端实习生',
    internSalary: '6500',
    internStartDate: '2026-03-15',
    internEndDate: '2026-07-31',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '是',
  },
  {
    id: 103,
    studentName: '王俊杰',
    studentId: '20220103',
    className: '二班',
    hometown: '吉林省吉林市',
    trainingDirection: TRAINING_OPTIONS[2],
    gender: '男',
    phone: '13734567890',
    destination: '已找到实习单位',
    internCompany: '中国第一汽车集团有限公司',
    internLocation: '吉林省长春市绿园区',
    internContact: '张部长',
    internContactPhone: '0431-8590000',
    businessLine: '红旗研发总院智能网联',
    internPosition: 'Java研发工程师',
    internSalary: '5500',
    internStartDate: '2026-02-20',
    internEndDate: '2026-08-20',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '否',
  },
  {
    id: 104,
    studentName: '赵晨阳',
    studentId: '20220104',
    className: '二班',
    hometown: '辽宁省沈阳市',
    trainingDirection: TRAINING_OPTIONS[2],
    gender: '男',
    phone: '13645678901',
    destination: '备考研究生',
    gradSchool: '吉林大学',
    gradMajor: '计算机系统结构',
    jobCategory: '升学、公职类',
    sopStatus: '否',
    starStatus: '否',
    remark: '目标考取吉大计算机学院硕士，目前备考状态良好',
  },
  {
    id: 105,
    studentName: '孙艺菲',
    studentId: '20220105',
    className: '三班',
    hometown: '山东省青岛市',
    trainingDirection: TRAINING_OPTIONS[1],
    gender: '女',
    phone: '13556789012',
    destination: '已找到实习单位',
    internCompany: '腾讯计算机系统有限公司',
    internLocation: '广东省深圳市南山区高新科技园',
    internContact: '陈总监',
    internContactPhone: '0755-86013388',
    businessLine: '微信支付核心研发',
    internPosition: '前端开发实习生',
    internSalary: '300/天',
    internStartDate: '2026-04-01',
    internEndDate: '2026-09-30',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '是',
  },
  {
    id: 106,
    studentName: '周浩然',
    studentId: '20220106',
    className: '三班',
    hometown: '吉林省四平市',
    trainingDirection: TRAINING_OPTIONS[2],
    gender: '男',
    phone: '13467890123',
    destination: '待实习',
    jobCategory: '待判定',
    sopStatus: '待判定',
    starStatus: '待判定',
    remark: '正在积极投递长春本地软件研发岗位',
  },
  {
    id: 107,
    studentName: '吴佳琪',
    studentId: '20220107',
    className: '四班',
    hometown: '辽宁省大连市',
    trainingDirection: TRAINING_OPTIONS[0],
    gender: '女',
    phone: '13378901234',
    destination: '备考公务员',
    jobCategory: '升学、公职类',
    sopStatus: '否',
    starStatus: '否',
    remark: '备考吉林省选调生及国考行政岗位',
  },
  {
    id: 108,
    studentName: '郑子涵',
    studentId: '20220108',
    className: '四班',
    hometown: '吉林省延边州',
    trainingDirection: TRAINING_OPTIONS[2],
    gender: '男',
    phone: '13289012345',
    destination: '已找到实习单位',
    internCompany: '华为技术有限公司',
    internLocation: '江苏省南京市雨花台区软件谷',
    internContact: '高主管',
    internContactPhone: '025-56667777',
    businessLine: '云计算与大数据平台',
    internPosition: '后端开发实习生',
    internSalary: '7500',
    internStartDate: '2026-03-10',
    internEndDate: '2026-08-31',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '是',
  },
  {
    id: 109,
    studentName: '冯晓萌',
    studentId: '20220109',
    className: '五班',
    hometown: '河北省唐山市',
    trainingDirection: TRAINING_OPTIONS[1],
    gender: '女',
    phone: '13190123456',
    destination: '已找到实习单位',
    internCompany: '阿里巴巴网络技术有限公司',
    internLocation: '浙江省杭州市余杭区西溪园区',
    internContact: '孙HR',
    internContactPhone: '0571-85022088',
    businessLine: '阿里云智能服务部',
    internPosition: '前端工程师',
    internSalary: '8500',
    internStartDate: '2026-03-01',
    internEndDate: '2026-08-31',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '是',
  },
  {
    id: 110,
    studentName: '陈伟祺',
    studentId: '20220110',
    className: '五班',
    hometown: '吉林省长春市',
    trainingDirection: TRAINING_OPTIONS[2],
    gender: '男',
    phone: '13001234567',
    destination: '已找到实习单位',
    internCompany: '长春吉大正元信息技术股份有限公司',
    internLocation: '吉林省长春市高新区硅谷大街',
    internContact: '钱经理',
    internContactPhone: '0431-85170000',
    businessLine: '网络安全中间件事业部',
    internPosition: 'Java安全研发实习生',
    internSalary: '4500',
    internStartDate: '2026-03-01',
    internEndDate: '2026-07-31',
    jobCategory: '非SOP类IT岗位',
    sopStatus: '否',
    starStatus: '否',
  },
  {
    id: 111,
    studentName: '韩天宇',
    studentId: '20220111',
    className: '六班',
    hometown: '黑龙江省大庆市',
    trainingDirection: TRAINING_OPTIONS[1],
    gender: '男',
    phone: '15912345678',
    destination: '已找到实习单位',
    internCompany: '网易（杭州）网络有限公司',
    internLocation: '浙江省杭州市滨江区网商路',
    internContact: '吴主管',
    internContactPhone: '0571-89852000',
    businessLine: '网易云音乐前端团队',
    internPosition: '前端开发工程师',
    internSalary: '7000',
    internStartDate: '2026-03-15',
    internEndDate: '2026-09-15',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '是',
  },
  {
    id: 112,
    studentName: '杨梦琪',
    studentId: '20220112',
    className: '六班',
    hometown: '内蒙古通辽市',
    trainingDirection: TRAINING_OPTIONS[0],
    gender: '女',
    phone: '15823456789',
    destination: '备考研究生',
    gradSchool: '东北师范大学',
    gradMajor: '计算机软件与理论',
    jobCategory: '升学、公职类',
    sopStatus: '否',
    starStatus: '否',
  },
  {
    id: 113,
    studentName: '徐嘉树',
    studentId: '20220113',
    className: '一班',
    hometown: '吉林省松原市',
    trainingDirection: TRAINING_OPTIONS[2],
    gender: '男',
    phone: '15734567890',
    destination: '待实习',
    jobCategory: '待判定',
    sopStatus: '待判定',
    starStatus: '待判定',
  },
  {
    id: 114,
    studentName: '高博文',
    studentId: '20220114',
    className: '二班',
    hometown: '吉林省通化市',
    trainingDirection: TRAINING_OPTIONS[2],
    gender: '男',
    phone: '15645678901',
    destination: '已找到实习单位',
    internCompany: '北京快手科技有限公司',
    internLocation: '北京市海淀区西二旗中路',
    internContact: '赵HR',
    internContactPhone: '010-89100000',
    businessLine: '商业化主站工程研发',
    internPosition: '服务端开发实习生',
    internSalary: '350/天',
    internStartDate: '2026-03-01',
    internEndDate: '2026-08-31',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '是',
  },
  {
    id: 115,
    studentName: '林诗涵',
    studentId: '20220115',
    className: '三班',
    hometown: '吉林省白山市',
    trainingDirection: TRAINING_OPTIONS[1],
    gender: '女',
    phone: '15556789012',
    destination: '已找到实习单位',
    internCompany: '上海寻梦信息技术有限公司（拼多多）',
    internLocation: '上海市长宁区娄山关路',
    internContact: '孙主管',
    internContactPhone: '021-52661111',
    businessLine: '移动端运营工具开发',
    internPosition: '前端开发实习生',
    internSalary: '8000',
    internStartDate: '2026-03-01',
    internEndDate: '2026-08-31',
    jobCategory: 'SOP类IT岗位',
    sopStatus: '是',
    starStatus: '否',
  }
];

/* --------------------------------------------------------------------------
   SVG Icons
   -------------------------------------------------------------------------- */

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconGraduationCap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="btn-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}

function IconReset() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

/* --------------------------------------------------------------------------
   Destination Status Badge
   -------------------------------------------------------------------------- */

function DestinationBadge({ dest }) {
  const canonical = canonicalDestination(dest);
  if (isInternDestination(dest) || isEmploymentCompanyDestination(dest)) {
    return (
      <span className="dd-badge dd-badge-interned">
        <span className="dd-badge-dot" />
        {isInternDestination(dest) ? '已实习' : canonicalEmploymentDestination(dest)}
      </span>
    );
  }
  if (canonical === '备考研究生') {
    return (
      <span className="dd-badge dd-badge-grad">
        <span className="dd-badge-dot" />
        备考研究生
      </span>
    );
  }
  if (canonical === '备考公务员') {
    return (
      <span className="dd-badge dd-badge-civil">
        <span className="dd-badge-dot" />
        备考公务员
      </span>
    );
  }
  return (
    <span className="dd-badge dd-badge-pending">
      <span className="dd-badge-dot" />
      {canonical || '待实习'}
    </span>
  );
}

function recordHasCompany(record) {
  return record.configType === '就业'
    ? isEmploymentCompanyDestination(record.destination)
    : isInternDestination(record.destination);
}

function recordHasSchool(record) {
  return record.configType === '就业'
    ? isEmploymentSuccessDestination(record.destination)
    : record.destination === '备考研究生';
}

/* --------------------------------------------------------------------------
   Data Processing Helpers
   -------------------------------------------------------------------------- */

function destStackLabel(dest) {
  if (isInternDestination(dest)) return '已实习';
  if (dest === '备考研究生' || dest === '备考公务员' || dest === '待实习') return dest;
  return null;
}

function uniqueStudents(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const sid = String(r.studentId || '').trim();
    const key = sid ? 'sid:' + sid : (r.id ? 'id:' + r.id : 'idx:' + out.length);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...r,
      destination: canonicalDestination(r.destination),
      trainingDirectionStd: String(r.trainingDirection || '').trim(),
    });
  }
  return out;
}

function trainingAxis(students) {
  const present = new Set();
  students.forEach((student) => {
    if (student.trainingDirectionStd) present.add(student.trainingDirectionStd);
  });
  return TRAINING_OPTIONS.filter((dir) => present.has(dir));
}

function groupByTrainingDir(students, labels) {
  const groups = {};
  labels.forEach((dir) => { groups[dir] = []; });
  students.forEach((student) => {
    const dir = student.trainingDirectionStd;
    if (groups[dir]) groups[dir].push(student);
  });
  return groups;
}

/** 记录创建日期（本地时区 YYYY-MM-DD）；演示数据没有该字段时显示占位符。 */
function formatCreatedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatRate(num, den) {
  if (!den) return { text: '--', sub: '--' };
  return {
    text: ((num / den) * 100).toFixed(1) + '%',
    sub: num + '/' + den + ' 人',
  };
}

function destroyCharts(bag) {
  Object.values(bag || {}).forEach((c) => {
    if (!c || typeof c.destroy !== 'function') return;
    try { c.destroy(); } catch (_) { /* already destroyed */ }
  });
}

function createChart(Chart, canvas, config) {
  if (!canvas || !canvas.isConnected) return null;
  const prev = typeof Chart.getChart === 'function' ? Chart.getChart(canvas) : null;
  if (prev) prev.destroy();
  return createLabeledChart(Chart, canvas, config);
}

function buildInternAnalytics(records) {
  const students = uniqueStudents(records);
  const dirLabels = trainingAxis(students);
  const groups = groupByTrainingDir(students, dirLabels);
  const total = students.length;
  const internCount = students.filter((r) => isInternDestination(r.destination)).length;
  const pendingCount = students.filter((r) => r.destination === '待实习').length;
  const gradCount = students.filter((r) => r.destination === '备考研究生').length;
  const civilCount = students.filter((r) => r.destination === '备考公务员').length;
  const matchCount = students.filter((r) => isInternDestination(r.destination) && MATCH_CATEGORIES.has(r.jobCategory)).length;
  const starCount = students.filter((r) => isInternDestination(r.destination) && r.starStatus === '是').length;
  const rawMatchRate = total ? (matchCount / total) * 100 : 0;
  const rawStarRate = total ? (starCount / total) * 100 : 0;

  const destStack = DEST_STACK_LABELS.map((label) => (
    dirLabels.map((d) => groups[d].filter((r) => destStackLabel(r.destination) === label).length)
  ));

  const perClass = dirLabels.map((d) => {
    const list = groups[d];
    const den = list.length;
    const matchNum = list.filter((r) => isInternDestination(r.destination) && MATCH_CATEGORIES.has(r.jobCategory)).length;
    const starNum = list.filter((r) => isInternDestination(r.destination) && r.starStatus === '是').length;
    const sopNum = list.filter((r) => isInternDestination(r.destination) && r.sopStatus === '是').length;
    return {
      total: den,
      matchNum,
      starNum,
      sopNum,
      matchRate: den ? (matchNum / den) * 100 : 0,
      starRate: den ? (starNum / den) * 100 : 0,
    };
  });

  const interned = students.filter((r) => isInternDestination(r.destination));
  const jobCatMap = {};
  CATEGORY_OPTIONS.forEach((k) => { jobCatMap[k] = 0; });
  const salaryCounts = Object.fromEntries(SALARY_BUCKETS.map((label) => [label, 0]));
  const placeCounts = {};
  interned.forEach((r) => {
    const cat = r.jobCategory || '待判定';
    if (jobCatMap[cat] !== undefined) jobCatMap[cat] += 1;
    else jobCatMap['其它岗位'] += 1;
    if (String(r.internSalary || '').trim()) {
      const parsed = analyzeSalary(r.internSalary);
      const bucket = parsed.monthly == null ? '无法识别' : salaryBucket(parsed.monthly);
      salaryCounts[bucket] = (salaryCounts[bucket] || 0) + 1;
    }
    if (String(r.internLocation || '').trim()) {
      const place = inferWorkPlace(r.internLocation);
      placeCounts[place] = (placeCounts[place] || 0) + 1;
    }
  });

  const salaryLabels = SALARY_BUCKETS.filter((label) => salaryCounts[label] > 0);
  if (salaryCounts['无法识别']) salaryLabels.push('无法识别');

  return {
    total,
    internCount,
    pendingCount,
    gradCount,
    civilCount,
    matchCount,
    starCount,
    matchRate: formatRate(matchCount, total),
    starRate: formatRate(starCount, total),
    rawMatchRate,
    rawStarRate,
    destStack,
    dirLabels,
    perClass,
    jobCatMap,
    internedCount: interned.length,
    salaryLabels,
    salaryData: salaryLabels.map((label) => salaryCounts[label] || 0),
    places: topWorkPlaces(placeCounts),
  };
}

/* --------------------------------------------------------------------------
   Main Component: DataDashboard
   -------------------------------------------------------------------------- */

export default function DataDashboard() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDest, setFilterDest] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ jobCategory: '待判定', companyCategory: '待判定', qualityStatus: '待判定', starStatus: '待判定' });
  const [loadError, setLoadError] = useState('');
  const [configs, setConfigs] = useState([]);
  const [configId, setConfigId] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [importFeedback, setImportFeedback] = useState(null);
  const [importing, setImporting] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [assessConfirm, setAssessConfirm] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [overwriteAssessment, setOverwriteAssessment] = useState(false);

  const selectedConfig = configs.find((c) => String(c.id) === String(configId));
  const employmentMode = selectedConfig?.type === '就业';

  const chartDestStackRef = useRef(null);
  const chartMatchRef = useRef(null);
  const chartStarRateRef = useRef(null);
  const chartSopCountRef = useRef(null);
  const chartJobCatRef = useRef(null);
  const chartSalaryRef = useRef(null);
  const chartPlaceRef = useRef(null);
  const fileRef = useRef(null);
  const chartsRef = useRef({});

  const analytics = useMemo(() => buildInternAnalytics(records), [records]);

  function loadDemoData() {
    setIsDemoMode(true);
    setConfigs(DEMO_CONFIGS);
    setConfigId('demo-1');
    setRecords(DEMO_RECORDS);
    setLoadError('');
  }

  function resetToLive() {
    setIsDemoMode(false);
    setConfigs([]);
    setConfigId('');
    setRecords([]);
    setLoadError('');
    fetch(withBasePath('/api/tracking-configs'), { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        const list = Array.isArray(data.configs) ? data.configs : [];
        setConfigs(list);
        if (list.length) setConfigId(String(list[0].id));
      })
      .catch((e) => {
        setLoadError('读取跟踪项目失败：' + e.message);
      });
  }

  async function loadAll(cid = configId) {
    if (isDemoMode) {
      if (cid === 'demo-1') setRecords(DEMO_RECORDS);
      else if (cid === 'demo-2') setRecords(DEMO_RECORDS.slice(0, 8));
      else setRecords(DEMO_RECORDS);
      return true;
    }
    if (!cid) {
      setRecords([]);
      return true;
    }
    try {
      const res = await fetch(withBasePath('/api/student-info?configId=' + encodeURIComponent(cid)), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      setRecords(Array.isArray(data.records) ? data.records : []);
      setLoadError('');
      return true;
    } catch (e) {
      setRecords([]);
      setLoadError('加载数据失败：' + e.message);
      return false;
    }
  }

  useEffect(() => {
    fetch(withBasePath('/api/tracking-configs'), { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        const list = Array.isArray(data.configs) ? data.configs : [];
        if (list.length > 0) {
          setConfigs(list);
          if (!configId) setConfigId(String(list[0].id));
        } else {
          // If no configs in database, enable demo mode for immediate preview
          loadDemoData();
        }
      })
      .catch(() => {
        // Fallback to high-fidelity demo dataset when database is unreachable
        loadDemoData();
      });
  }, []);

  useEffect(() => {
    if (!configId) return;
    loadAll(configId);
  }, [configId, isDemoMode]);

  /* --------------------------------------------------------------------------
     Chart.js Lifecycle & Configuration
     -------------------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    const localCharts = {};

    import('chart.js/auto').then(({ default: Chart }) => {
      if (cancelled) return;

      const tickFont = {
        family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        size: 11,
      };
      const gridConfig = { color: 'rgba(226, 232, 240, 0.7)', drawBorder: false };
      const modernTooltip = {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 12 },
      };

      const rateTooltip = (meta, unit) => ({
        ...modernTooltip,
        callbacks: {
          label(ctx) {
            const m = meta[ctx.dataIndex];
            if (!m || !m.den) return ' --';
            return ' ' + m.rate.toFixed(1) + '%（' + m.num + '/' + m.den + ' 人）';
          },
          title(items) {
            return (items[0] && items[0].label) || unit;
          },
        },
      });

      // 1. 各实训方向实习去向分布 (Stacked Bar)
      if (chartDestStackRef.current) {
        localCharts.destStack = createChart(Chart, chartDestStackRef.current, {
          type: 'bar',
          data: {
            labels: analytics.dirLabels,
            datasets: DEST_STACK_LABELS.map((label, i) => ({
              label,
              data: analytics.destStack[i],
              backgroundColor: DEST_STACK_COLORS[i],
              stack: 'dest',
              borderRadius: 4,
            })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 12 }, boxWidth: 12, padding: 16 } },
              tooltip: modernTooltip,
            },
            scales: {
              x: { stacked: true, ticks: { font: tickFont, color: '#64748b' }, grid: { display: false } },
              y: { stacked: true, beginAtZero: true, ticks: { precision: 0, font: tickFont, color: '#64748b' }, grid: gridConfig },
            },
          },
        });
      }

      // 2. 各实训方向实习对口率 (Bar)
      const matchMeta = analytics.perClass.map((c) => ({ num: c.matchNum, den: c.total, rate: c.matchRate }));
      if (chartMatchRef.current) {
        localCharts.match = createChart(Chart, chartMatchRef.current, {
          type: 'bar',
          data: {
            labels: analytics.dirLabels,
            datasets: [{
              label: '实习对口率',
              data: analytics.perClass.map((c) => c.matchRate),
              backgroundColor: '#2563eb',
              borderRadius: { topLeft: 6, topRight: 6 },
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: rateTooltip(matchMeta, '实习对口率'), chartValueLabels: { format: 'percent' } },
            scales: {
              x: { ticks: { font: tickFont, color: '#64748b' }, grid: { display: false } },
              y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%', font: tickFont, color: '#64748b' }, grid: gridConfig },
            },
          },
        });
      }

      // 3. 各实训方向实习明星率 (Bar)
      const starMeta = analytics.perClass.map((c) => ({ num: c.starNum, den: c.total, rate: c.starRate }));
      if (chartStarRateRef.current) {
        localCharts.starRate = createChart(Chart, chartStarRateRef.current, {
          type: 'bar',
          data: {
            labels: analytics.dirLabels,
            datasets: [{
              label: '实习明星率',
              data: analytics.perClass.map((c) => c.starRate),
              backgroundColor: '#f59e0b',
              borderRadius: { topLeft: 6, topRight: 6 },
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: rateTooltip(starMeta, '实习明星率'), chartValueLabels: { format: 'percent' } },
            scales: {
              x: { ticks: { font: tickFont, color: '#64748b' }, grid: { display: false } },
              y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%', font: tickFont, color: '#64748b' }, grid: gridConfig },
            },
          },
        });
      }

      // 4. 各实训方向 SOP 岗位人数 (Bar)
      if (chartSopCountRef.current) {
        localCharts.sopCount = createChart(Chart, chartSopCountRef.current, {
          type: 'bar',
          data: {
            labels: analytics.dirLabels,
            datasets: [{
              label: 'SOP 岗位人数',
              data: analytics.perClass.map((c) => c.sopNum),
              backgroundColor: '#10b981',
              borderRadius: { topLeft: 6, topRight: 6 },
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: modernTooltip },
            scales: {
              x: { ticks: { font: tickFont, color: '#64748b' }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { precision: 0, font: tickFont, color: '#64748b' }, grid: gridConfig },
            },
          },
        });
      }

      // 5. 实习薪资分布 (Bar)
      if (analytics.salaryData.length && chartSalaryRef.current) {
        localCharts.salary = createChart(Chart, chartSalaryRef.current, {
          type: 'bar',
          data: {
            labels: analytics.salaryLabels,
            datasets: [{
              label: '人数',
              data: analytics.salaryData,
              backgroundColor: analytics.salaryLabels.map((label) => (
                label === '无法识别' ? '#94a3b8' : SALARY_COLORS[SALARY_BUCKETS.indexOf(label)] || '#2563eb'
              )),
              borderRadius: { topLeft: 6, topRight: 6 },
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: modernTooltip },
            scales: {
              x: { ticks: { font: tickFont, color: '#64748b' }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { precision: 0, font: tickFont, color: '#64748b' }, grid: gridConfig },
            },
          },
        });
      }

      // 6. 实习地点分布 (Horizontal Bar)
      if (analytics.places.labels.length && chartPlaceRef.current) {
        localCharts.place = createChart(Chart, chartPlaceRef.current, {
          type: 'bar',
          data: {
            labels: analytics.places.labels,
            datasets: [{
              label: '人数',
              data: analytics.places.data,
              backgroundColor: '#0d9488',
              borderRadius: { topRight: 6, bottomRight: 6 },
            }],
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: modernTooltip },
            scales: {
              x: { beginAtZero: true, ticks: { precision: 0, font: tickFont, color: '#64748b' }, grid: gridConfig },
              y: { ticks: { font: tickFont, color: '#64748b' }, grid: { display: false } },
            },
          },
        });
      }

      // 7. 岗位分类分布 (Doughnut)
      const jobCatData = CATEGORY_OPTIONS
        .map((label) => ({ label, count: analytics.jobCatMap[label] || 0 }))
        .filter((d) => d.count > 0);

      if (jobCatData.length && chartJobCatRef.current) {
        localCharts.jobCat = createChart(Chart, chartJobCatRef.current, {
          type: 'doughnut',
          data: {
            labels: jobCatData.map((d) => d.label),
            datasets: [{
              data: jobCatData.map((d) => d.count),
              backgroundColor: jobCatData.map((d) => JOB_CATEGORY_COLORS[d.label] || '#94a3b8'),
              borderWidth: 2,
              borderColor: '#ffffff',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10, padding: 12 } },
              tooltip: modernTooltip,
            },
          },
        });
      }

      if (cancelled) {
        destroyCharts(localCharts);
        return;
      }
      destroyCharts(chartsRef.current);
      chartsRef.current = localCharts;
    });

    return () => {
      cancelled = true;
      if (chartsRef.current !== localCharts) destroyCharts(localCharts);
      destroyCharts(chartsRef.current);
      chartsRef.current = {};
    };
  }, [analytics]);

  /* --------------------------------------------------------------------------
     Computed KPI Cards & Filters
     -------------------------------------------------------------------------- */
  const cohortMark = (selectedConfig && String(selectedConfig.title).match(/\d{4}届/)) || null;
  const totalLabel = (cohortMark ? cohortMark[0] : '') + '学生总数';

  const kpis = [
    {
      num: analytics.total,
      label: totalLabel,
      sub: selectedConfig ? '建档基数 100%' : '档案总数',
      theme: 'theme-blue',
      icon: <IconUsers />,
    },
    {
      num: analytics.internCount,
      label: '已实习学生',
      sub: analytics.total ? `占比 ${((analytics.internCount / analytics.total) * 100).toFixed(1)}%` : '--',
      theme: 'theme-green',
      icon: <IconBriefcase />,
    },
    {
      num: analytics.pendingCount,
      label: '待实习学生',
      sub: analytics.total ? `占比 ${((analytics.pendingCount / analytics.total) * 100).toFixed(1)}%` : '--',
      theme: 'theme-amber',
      icon: <IconClock />,
    },
    {
      num: analytics.gradCount,
      label: '备考研究生',
      sub: analytics.total ? `占比 ${((analytics.gradCount / analytics.total) * 100).toFixed(1)}%` : '--',
      theme: 'theme-purple',
      icon: <IconGraduationCap />,
    },
    {
      num: analytics.civilCount,
      label: '备考公务员',
      sub: analytics.total ? `占比 ${((analytics.civilCount / analytics.total) * 100).toFixed(1)}%` : '--',
      theme: 'theme-rose',
      icon: <IconBuilding />,
    },
  ];


  // 筛选项 = 标准三项 + 数据里实际出现的其它方向，避免命名不一致时整批记录被筛掉
  const dirFilterOptions = useMemo(() => {
    const present = new Set(records.map((r) => String(r.trainingDirection || '').trim()).filter(Boolean));
    const extra = [...present]
      .filter((dir) => !TRAINING_OPTIONS.includes(dir))
      .sort((a, b) => a.localeCompare(b, 'zh'));
    return [...TRAINING_OPTIONS, ...extra];
  }, [records]);

  const list = records.filter((r) => {
    if (filterClass && r.className !== filterClass) return false;
    if (filterDest) {
      if (filterDest === INTERN_DEST_LABEL) {
        if (!isInternDestination(r.destination)) return false;
      } else if (canonicalDestination(r.destination) !== filterDest) {
        return false;
      }
    }
    if (filterDir && r.trainingDirection !== filterDir) return false;
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      const hay = (
        (r.studentName || '') + ' ' +
        (r.studentId || '') + ' ' +
        (r.internCompany || '') + ' ' +
        (r.internPosition || '') + ' ' +
        (r.gradSchool || '')
      ).toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });

  const isFiltered = Boolean(search.trim() || filterClass || filterDest || filterDir);

  function clearFilters() {
    setSearch('');
    setFilterClass('');
    setFilterDest('');
    setFilterDir('');
  }

  /* --------------------------------------------------------------------------
     Excel & Data Handlers
     -------------------------------------------------------------------------- */
  async function exportExcel() {
    const XLSX = await import('xlsx');
    const stage = employmentMode ? '就业' : '实习';
    const header = [
      '序号', '姓名', '班级', '学号', '籍贯', '实训方向', '性别', '手机号',
      '去向', `${stage}单位名称`, `${stage}单位具体地点`, `${stage}单位联系人`, `${stage}单位联系人电话`,
      '具体业务线', `${stage}岗位`, `${stage}薪资`, `${stage}入职时间`, `${stage}结束时间`,
      employmentMode ? '上岸单位/院校' : '考研目标院校', employmentMode ? '岗位/专业' : '目标专业',
      '备注', '岗位分类', '是否SOP岗位', employmentMode ? '是否明星就业' : '是否实习明星',
      '单位省份', '单位城市', '与实习单位是否一致', '与实习岗位是否一致', '企业分类', '是否明星企业',
    ];
    const rows = records.map((r, i) => [
      i + 1, r.studentName, r.className, r.studentId, r.hometown,
      r.trainingDirection, r.gender, r.phone,
      employmentMode ? canonicalEmploymentDestination(r.destination) : canonicalDestination(r.destination),
      r.internCompany, r.internLocation, r.internContact, r.internContactPhone,
      r.businessLine, r.internPosition, salaryDisplay(r.internSalary), r.internStartDate, r.internEndDate,
      r.gradSchool, r.gradMajor, r.remark,
      r.jobCategory || '待判定', r.sopStatus || '待判定', r.starStatus || '待判定',
      r.employmentProvince || '', r.employmentCity || '', r.sameInternCompany || '', r.sameInternPosition || '',
      r.companyCategory || '待判定', r.qualityStatus || '待判定',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 6 }, { wch: 14 }, { wch: 18 },
      { wch: 20 }, { wch: 36 }, { wch: 12 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 18 }, { wch: 16 }, { wch: 24 },
      { wch: 18 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${stage}统计`);
    const title = (configs.find((c) => String(c.id) === String(configId)) || {}).title || '实习就业数据';
    XLSX.writeFile(wb, title + '.xlsx');
  }

  async function importExcel(input) {
    if (!input.files || !input.files[0]) return;
    const fileName = input.files[0].name;
    let sheetName = '';
    setImporting(true);
    setImportFeedback({
      type: 'processing',
      title: '正在导入',
      message: `正在解析并写入「${fileName}」，数据较多时需要几十秒，请勿关闭页面。`,
      fileName,
      sheetName,
      details: [],
    });
    try {
      if (isDemoMode) {
        setImportFeedback({
          type: 'error',
          title: '导入失败（项目）',
          message: '当前为演示模式，不能写入真实数据。请连接真实跟踪项目后再导入。',
          fileName,
          sheetName,
          details: [
            '演示项目（如 demo-1）不是可写入的真实项目 ID',
            '请点击「尝试连接真实数据库」并选择真实跟踪项目',
          ],
        });
        return;
      }

      const XLSX = await import('xlsx');
      const buf = await input.files[0].arrayBuffer();
      const wb = readImportWorkbook(XLSX, buf, fileName);
      if (!wb.SheetNames || !wb.SheetNames.length) {
        setImportFeedback({
          type: 'error',
          title: '导入失败（解析）',
          message: '工作簿中没有工作表。',
          fileName,
          details: [],
        });
        return;
      }
      sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, blankrows: true });
      const parsed = parseStudentSheet(rows);
      const items = parsed.items || [];
      const skipped = parsed.skipped || 0;
      const total = parsed.total || 0;
      const dailyConverted = parsed.dailyConverted || 0;
      const parseIssues = Array.isArray(parsed.issues) ? parsed.issues : [];
      const headerIssue = parseIssues.find((issue) => issue.code === 'HEADER_NOT_FOUND');

      if (!items.length) {
        setImportFeedback({
          type: 'error',
          title: headerIssue ? '导入失败（表头）' : '导入失败（解析）',
          message: headerIssue
            ? headerIssue.message
            : (parseIssues[0] && parseIssues[0].message)
              || '没有读到可导入的数据。请使用含「姓名」「学号」表头的表格，模板第一行可以是标题。',
          fileName,
          sheetName,
          details: parseIssues,
        });
        return;
      }

      if (!configId) {
        setImportFeedback({
          type: 'error',
          title: '导入失败（项目）',
          message: '请先选择跟踪项目，再导入。',
          fileName,
          sheetName,
          details: parseIssues,
        });
        return;
      }
      const numericConfigId = Number(configId);
      if (!Number.isInteger(numericConfigId) || numericConfigId <= 0) {
        setImportFeedback({
          type: 'error',
          title: '导入失败（项目）',
          message: '当前选择的不是可写入的真实跟踪项目，请选择真实项目后再导入。',
          fileName,
          sheetName,
          details: [`当前项目 ID：${configId}`, ...parseIssues],
        });
        return;
      }

      let res;
      try {
        res = await fetch(withBasePath('/api/student-info/batch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, configId: numericConfigId }),
        });
      } catch (err) {
        setImportFeedback({
          type: 'error',
          title: '导入失败（请求）',
          message: '无法连接到导入接口：' + (err.message || '网络错误'),
          fileName,
          sheetName,
          details: parseIssues,
        });
        return;
      }

      const rawText = await res.text();
      let data = {};
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          setImportFeedback({
            type: 'error',
            title: '导入失败（HTTP 非 JSON）',
            message: `服务器返回了无法解析的响应（HTTP ${res.status}）`,
            fileName,
            sheetName,
            details: [`HTTP ${res.status}，响应不是 JSON`, ...parseIssues],
          });
          return;
        }
      }

      const imported = Number.isInteger(data.imported) ? data.imported : 0;
      const existingKept = Number.isInteger(data.existing) ? data.existing : 0;
      const apiSkipped = Number.isInteger(data.skipped) ? data.skipped : 0;
      const apiIssues = Array.isArray(data.issues) ? data.issues : [];
      const details = [...parseIssues, ...apiIssues];
      const convertedNote = dailyConverted ? `其中 ${dailyConverted} 条日薪已按 22 个工作日折算为月薪。` : '';
      const countNote = `本次新增 ${imported} 条，旧数据保留 ${existingKept} 条（学号已存在，未覆盖），跳过 ${skipped + apiSkipped} 条，共读取 ${total} 行。`;

      if (imported > 0 || existingKept > 0) {
        const refreshed = await loadAll();
        if (!res.ok) {
          setImportFeedback({
            type: 'warning',
            title: refreshed ? '部分导入失败（写入）' : '部分导入失败（写入/刷新）',
            message: (data.error || '写入中断')
              + `。${countNote}${convertedNote}`
              + (refreshed ? '' : '刷新列表失败，请手动点击刷新查看已写入数据。'),
            fileName,
            sheetName,
            details,
          });
          return;
        }
        if (!refreshed) {
          setImportFeedback({
            type: 'warning',
            title: '导入成功但刷新失败',
            message: `${countNote}${convertedNote}刷新列表失败，请手动点击刷新。`,
            fileName,
            sheetName,
            details,
          });
          return;
        }
        setImportFeedback({
          type: details.length ? 'warning' : 'success',
          title: details.length ? '导入完成（含提示）' : (imported > 0 ? '导入完成' : '导入完成（无新增）'),
          message: countNote + convertedNote,
          fileName,
          sheetName,
          details,
        });
        return;
      }

      const stage = !res.ok && /跟踪项目/.test(data.error || '') ? '项目' : '写入';
      setImportFeedback({
        type: 'error',
        title: `导入失败（${stage}）`,
        message: data.error || (res.ok ? `没有可写入的记录。${countNote}` : `导入失败（HTTP ${res.status}）`),
        fileName,
        sheetName,
        details,
      });
    } catch (e) {
      setImportFeedback({
        type: 'error',
        title: '导入失败（解析）',
        message: e.message || '读取 Excel 失败',
        fileName,
        sheetName,
        details: [],
      });
    } finally {
      setImporting(false);
      input.value = '';
    }
  }

  async function clearAll() {
    if (clearing) return;
    if (isDemoMode) {
      setRecords([]);
      setClearConfirm(false);
      setImportFeedback({ type: 'success', title: '清空完成', message: '演示数据已清空。', details: [] });
      return;
    }
    if (!configId) {
      setClearConfirm(false);
      setImportFeedback({ type: 'error', title: '清空失败', message: '请先选择跟踪项目。', details: [] });
      return;
    }
    setClearing(true);
    try {
      const res = await fetch(withBasePath('/api/student-info?configId=' + encodeURIComponent(configId)), { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      const deleted = Number.isInteger(data.deleted) ? data.deleted : 0;
      await loadAll();
      setClearConfirm(false);
      setImportFeedback({
        type: 'success',
        title: '清空完成',
        message: `已清除「${(selectedConfig || {}).title || '当前项目'}」的 ${deleted} 条学生档案记录。`,
        details: [],
      });
    } catch (e) {
      setImportFeedback({ type: 'error', title: '清空失败', message: e.message || '清空失败', details: [] });
    } finally {
      setClearing(false);
    }
  }

  async function assessAll() {
    if (assessing) return;
    if (isDemoMode) {
      setRecords((prev) => prev.map((r) => ({ ...r, ...assessRecord({ ...r, configType: selectedConfig?.type || '实习' }) })));
      setAssessConfirm(false);
      setImportFeedback({ type: 'success', title: '判定完成', message: '演示数据已按规则判定。', details: describeRules(selectedConfig?.type) });
      return;
    }
    if (!configId) {
      setAssessConfirm(false);
      setImportFeedback({ type: 'error', title: '判定失败', message: '请先选择跟踪项目。', details: [] });
      return;
    }
    setAssessing(true);
    try {
      const res = await fetch(withBasePath('/api/student-info/assess'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: Number(configId), overwrite: overwriteAssessment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      const assessed = Number.isInteger(data.assessed) ? data.assessed : 0;
      const kept = Number.isInteger(data.kept) ? data.kept : 0;
      const total = Number.isInteger(data.total) ? data.total : 0;
      await loadAll();
      setAssessConfirm(false);
      setImportFeedback({
        type: 'success',
        title: '判定完成',
        message: `已按规则更新 ${assessed} 条，保持原判定 ${kept} 条，共 ${total} 条记录。`,
        details: describeRules(selectedConfig?.type),
      });
    } catch (e) {
      setImportFeedback({ type: 'error', title: '判定失败', message: e.message || '判定失败', details: [] });
    } finally {
      setAssessing(false);
    }
  }

  async function deleteRec(id) {
    if (!confirm('确认删除这条记录？')) return;
    if (isDemoMode) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      return;
    }
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
      companyCategory: r.companyCategory || '待判定',
      qualityStatus: r.qualityStatus || '待判定',
      starStatus: r.starStatus || '待判定',
    });
    setEditing(true);
  }

  async function saveAssessment(id) {
    const changes = Object.fromEntries(Object.entries(editForm).filter(([key, value]) => value !== (detail?.[key] || '待判定')));
    if (!Object.keys(changes).length) {
      setEditing(false);
      return;
    }
    if (isDemoMode) {
      const applyChanges = (record) => {
        const next = { ...record, ...changes };
        if (changes.jobCategory) next.sopStatus = deriveSopStatus(changes.jobCategory);
        if (changes.companyCategory && !changes.starStatus && !record.starStatusManual) {
          next.starStatus = assessRecord({ ...next, configType: selectedConfig?.type || '实习' }).starStatus;
        }
        return next;
      };
      setRecords((prev) => prev.map((r) => (r.id === id ? applyChanges(r) : r)));
      setDetail((prev) => (prev && prev.id === id ? applyChanges(prev) : prev));
      setEditing(false);
      return;
    }
    try {
      const res = await fetch(withBasePath('/api/student-info/' + id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
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

  /* --------------------------------------------------------------------------
     Render UI
     -------------------------------------------------------------------------- */
  return (
    <div className="container dashboard-intern">
      {/* Demo Mode Notice Banner */}
      {isDemoMode ? (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          color: '#1d4ed8',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✨</span>
            <span>
              <strong>当前正在体验高保真演示数据</strong>（共 15 条模拟学生记录，支持测试图表穿透、条件筛选与教师判定修改）。
            </span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ background: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe' }}
            onClick={resetToLive}
          >
            尝试连接真实数据库
          </button>
        </div>
      ) : null}
      <ImportFeedback feedback={importFeedback} onDismiss={() => setImportFeedback(null)} />

      {/* 1. Modern Page Header */}
      <header className="dd-header">
        <div className="dd-header-top">
          <div className="dd-breadcrumb">
            <span>就业运营工作台</span>
            <span className="dd-breadcrumb-dot" />
            <span>实习就业监控大屏</span>
            <span className="dd-breadcrumb-dot" />
            <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedConfig ? selectedConfig.title : '数据分析看板'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
            <IconActivity />
            <span>{isDemoMode ? '演示数据模式' : '实时数据监控'}</span>
          </div>
        </div>

        <div className="dd-header-main">
          <div className="dd-header-left">
            <div className="dd-header-title-row">
              <h1 className="dd-header-title">{selectedConfig ? selectedConfig.title : '实习就业信息监控'}</h1>
              {selectedConfig ? (
                <span className={`dd-type-badge ${selectedConfig.type === '就业' ? 'job' : 'intern'}`}>
                  <span className="dd-type-dot" />
                  {selectedConfig.type === '就业' ? '就业跟踪' : '实习跟踪'}
                </span>
              ) : null}
            </div>
            <p className="dd-header-desc">
              深度分析该批次学生提交的实习去向、岗位对口结构、薪资档位与升学公考动态，支持一键筛选、教师判定及 Excel 导入导出。
            </p>
          </div>

          <div className="dd-header-actions">
            <div className="dd-select-project-wrap">
              <span className="dd-select-project-icon"><IconCalendar /></span>
              {configs.length === 0 ? (
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>暂无跟踪项目</span>
              ) : (
                <select
                  className="dd-select-project"
                  value={configId}
                  onChange={(e) => switchConfig(e.target.value)}
                  aria-label="选择跟踪项目"
                >
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              )}
              <span className="dd-select-chevron"><IconChevronDown /></span>
            </div>

            <div className="dd-btn-group">
              {!isDemoMode ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe' }}
                  onClick={loadDemoData}
                  title="载入模拟数据体验完整图表与表格"
                >
                  <IconSparkles /> 示例数据
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={exportExcel} title="导出学生记录表格">
                <IconDownload /> 导出 Excel
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAssessConfirm(true)}
                disabled={assessing || clearing || importing}
                title="按规则自动判定岗位分类与实习明星"
              >
                {assessing ? <IconSpinner /> : <IconSparkles />} 智能判定
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fileRef.current && fileRef.current.click()}
                disabled={importing}
                aria-busy={importing}
                title="从 Excel 批量导入学生数据"
              >
                {importing ? <IconSpinner /> : <IconUpload />} {importing ? '导入中…' : '导入 Excel'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                disabled={importing}
                onChange={(e) => importExcel(e.target)}
              />
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setClearConfirm(true)}
                disabled={clearing || importing}
                title="清空当前跟踪项目的全部学生数据"
              >
                <IconTrash /> 清空
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Primary KPI Stat Cards (5 cols) */}
      <section className="dd-kpi-grid">
        {kpis.map((s) => (
          <div className={`dd-kpi-card ${s.theme}`} key={s.label}>
            <div className="dd-kpi-header">
              <span className="dd-kpi-title">{s.label}</span>
              <div className="dd-kpi-icon-box">{s.icon}</div>
            </div>
            <div className="dd-kpi-body">
              <span className="dd-kpi-number">{s.num}</span>
              {s.sub ? <span className="dd-kpi-badge">{s.sub}</span> : null}
            </div>
          </div>
        ))}
      </section>

      {/* 3. Core Quality Rate Cards (2 cols with progress bars) */}
      <section className="dd-rates-grid">
        <div className="dd-rate-card match">
          <div className="dd-rate-top">
            <div className="dd-rate-label-wrap">
              <div className="dd-rate-icon"><IconTarget /></div>
              <div>
                <div className="dd-rate-name">实习专业对口率</div>
                <div className="dd-rate-sub-desc">SOP 及 IT 专业对口岗位学生占比</div>
              </div>
            </div>
            <div className="dd-rate-num">{analytics.matchRate.text}</div>
          </div>
          <div className="dd-rate-progress-bg">
            <div
              className="dd-rate-progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, analytics.rawMatchRate))}%` }}
            />
          </div>
          <div className="dd-rate-footer">
            <span>对口人数基数</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{analytics.matchRate.sub}</span>
          </div>
        </div>

        <div className="dd-rate-card star">
          <div className="dd-rate-top">
            <div className="dd-rate-label-wrap">
              <div className="dd-rate-icon"><IconStar /></div>
              <div>
                <div className="dd-rate-name">实习明星推荐率</div>
                <div className="dd-rate-sub-desc">综合表现突出与教师标杆推荐学生</div>
              </div>
            </div>
            <div className="dd-rate-num">{analytics.starRate.text}</div>
          </div>
          <div className="dd-rate-progress-bg">
            <div
              className="dd-rate-progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, analytics.rawStarRate))}%` }}
            />
          </div>
          <div className="dd-rate-footer">
            <span>明星学生基数</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{analytics.starRate.sub}</span>
          </div>
        </div>
      </section>

      {/* 4. Deep Visual Analytics & Charts */}
      <div className="dd-section-header">
        <div className="dd-section-title-wrap">
          <span className="dd-section-title-icon"><IconActivity /></span>
          <h2 className="dd-section-title">多维数据分布图表</h2>
        </div>
        <p className="dd-section-desc">透视实训方向去向走向、对口质量、薪资待遇档位及就业重点城市</p>
      </div>

      {/* Full width stacked bar chart */}
      <div className="dd-chart-box full">
        <div className="dd-chart-header">
          <div>
            <h3 className="dd-chart-title">
              <span className="dd-chart-title-accent" />
              各实训方向实习去向分布
            </h3>
            <p className="dd-chart-hint">分析各实训方向学生在已实习、备考研、备考公与待实习的具体人数构成</p>
          </div>
        </div>
        <div className="dd-chart-canvas-wrap">
          {analytics.dirLabels.length === 0 ? (
            <div className="dd-empty-chart">
              <div className="dd-empty-chart-icon"><IconBarChart /></div>
              <div style={{ fontWeight: 600, color: '#475569' }}>暂无实训方向去向数据</div>
              <span>学生登记或导入数据后图表将自动生成堆叠统计</span>
            </div>
          ) : (
            <canvas ref={chartDestStackRef} id="chartDestStack" />
          )}
        </div>
      </div>

      {/* Chart Grid 1: 对口率 & 明星率 */}
      <div className="dd-chart-grid">
        <div className="dd-chart-box">
          <div className="dd-chart-header">
            <div>
              <h3 className="dd-chart-title">
                <span className="dd-chart-title-accent" />
                各实训方向实习对口率
              </h3>
              <p className="dd-chart-hint">展示各实训方向已实习学生匹配 SOP 类与 IT 岗位的百分比</p>
            </div>
          </div>
          <div className="dd-chart-canvas-wrap">
            {analytics.dirLabels.length === 0 ? (
              <div className="dd-empty-chart">
                <div className="dd-empty-chart-icon"><IconBarChart /></div>
                <div style={{ fontWeight: 600, color: '#475569' }}>暂无实训方向对口率数据</div>
              </div>
            ) : (
              <canvas ref={chartMatchRef} id="chartMatch" />
            )}
          </div>
        </div>

        <div className="dd-chart-box">
          <div className="dd-chart-header">
            <div>
              <h3 className="dd-chart-title">
                <span className="dd-chart-title-accent" style={{ background: '#f59e0b' }} />
                各实训方向实习明星率
              </h3>
              <p className="dd-chart-hint">展示各实训方向被评定为实习明星的学生占比</p>
            </div>
          </div>
          <div className="dd-chart-canvas-wrap">
            {analytics.dirLabels.length === 0 ? (
              <div className="dd-empty-chart">
                <div className="dd-empty-chart-icon"><IconBarChart /></div>
                <div style={{ fontWeight: 600, color: '#475569' }}>暂无实训方向明星率数据</div>
              </div>
            ) : (
              <canvas ref={chartStarRateRef} id="chartStarRate" />
            )}
          </div>
        </div>
      </div>

      {/* Chart Grid 2: 薪资分布 & 地点分布 */}
      <div className="dd-chart-grid">
        <div className="dd-chart-box">
          <div className="dd-chart-header">
            <div>
              <h3 className="dd-chart-title">
                <span className="dd-chart-title-accent" style={{ background: '#3b82f6' }} />
                实习薪资分布档位
              </h3>
              <p className="dd-chart-hint">日薪已按 22 个工作日自动折算为月薪，按规范薪资区间聚合</p>
            </div>
          </div>
          <div className="dd-chart-canvas-wrap">
            {analytics.salaryData.length === 0 ? (
              <div className="dd-empty-chart">
                <div className="dd-empty-chart-icon"><IconBarChart /></div>
                <div style={{ fontWeight: 600, color: '#475569' }}>暂无实习薪资数据</div>
                <span>录入学生实习薪资后将自动按档位分箱呈现</span>
              </div>
            ) : (
              <canvas ref={chartSalaryRef} id="chartSalary" />
            )}
          </div>
        </div>

        <div className="dd-chart-box">
          <div className="dd-chart-header">
            <div>
              <h3 className="dd-chart-title">
                <span className="dd-chart-title-accent" style={{ background: '#0d9488' }} />
                主要实习城市与地点分布
              </h3>
              <p className="dd-chart-hint">自动从实习单位地址提取并归一化为省市地点</p>
            </div>
          </div>
          <div className="dd-chart-canvas-wrap" style={{ height: Math.max(290, analytics.places.labels.length * 36) }}>
            {analytics.places.labels.length === 0 ? (
              <div className="dd-empty-chart">
                <div className="dd-empty-chart-icon"><IconBarChart /></div>
                <div style={{ fontWeight: 600, color: '#475569' }}>暂无实习地点数据</div>
                <span>登记实习地点后将自动汇总城市分布排行</span>
              </div>
            ) : (
              <canvas ref={chartPlaceRef} id="chartPlace" />
            )}
          </div>
        </div>
      </div>

      {/* Chart Grid 3: SOP 岗位人数 & 岗位分类分布 */}
      <div className="dd-chart-grid">
        <div className="dd-chart-box">
          <div className="dd-chart-header">
            <div>
              <h3 className="dd-chart-title">
                <span className="dd-chart-title-accent" style={{ background: '#10b981' }} />
                各实训方向 SOP 岗位人数
              </h3>
              <p className="dd-chart-hint">统计各实训方向进入企业规范化 SOP 流程岗位的实习人数</p>
            </div>
          </div>
          <div className="dd-chart-canvas-wrap">
            {analytics.dirLabels.length === 0 ? (
              <div className="dd-empty-chart">
                <div className="dd-empty-chart-icon"><IconBarChart /></div>
                <div style={{ fontWeight: 600, color: '#475569' }}>暂无实训方向 SOP 数据</div>
              </div>
            ) : (
              <canvas ref={chartSopCountRef} id="chartSopCount" />
            )}
          </div>
        </div>

        <div className="dd-chart-box">
          <div className="dd-chart-header">
            <div>
              <h3 className="dd-chart-title">
                <span className="dd-chart-title-accent" style={{ background: '#8b5cf6' }} />
                已实习学生岗位分类分布
              </h3>
              <p className="dd-chart-hint">涵盖 SOP 类、非 SOP 类、IT 企业非 IT 岗及其他岗位结构</p>
            </div>
          </div>
          <div className="dd-chart-canvas-wrap">
            {analytics.internedCount === 0 ? (
              <div className="dd-empty-chart">
                <div className="dd-empty-chart-icon"><IconBarChart /></div>
                <div style={{ fontWeight: 600, color: '#475569' }}>暂无已实习学生岗位分类数据</div>
                <span>完成教师判定后将生成岗位分类占比环形图</span>
              </div>
            ) : (
              <canvas ref={chartJobCatRef} id="chartJobCat" />
            )}
          </div>
        </div>
      </div>

      {/* 5. Student Records Table & Search Toolbar */}
      <div className="dd-card">
        <div className="dd-card-header">
          <div className="dd-card-title-group">
            <h3 className="dd-card-title">学生档案记录与明细</h3>
            <span className="dd-count-pill">全部 {records.length} 人</span>
            {isFiltered ? <span className="dd-count-pill filtered">已筛选 {list.length} 人</span> : null}
          </div>
        </div>

        {/* Toolbar */}
        <div className="dd-toolbar">
          <div className="dd-search-input-wrap">
            <span className="dd-search-icon"><IconSearch /></span>
            <input
              id="search"
              type="text"
              className="dd-search-input"
              placeholder="搜索姓名 / 学号 / 实习单位 / 岗位 / 考研院校..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button type="button" className="dd-search-clear" onClick={() => setSearch('')} title="清空搜索">
                <IconX />
              </button>
            ) : null}
          </div>

          <select
            id="filterClass"
            className="dd-filter-select"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">全部班级</option>
            <option value="一班">一班</option>
            <option value="二班">二班</option>
            <option value="三班">三班</option>
            <option value="四班">四班</option>
            <option value="五班">五班</option>
            <option value="六班">六班</option>
          </select>

          <select
            id="filterDest"
            className="dd-filter-select"
            value={filterDest}
            onChange={(e) => setFilterDest(e.target.value)}
          >
            <option value="">全部去向</option>
            {employmentMode ? (
              <>
                {EMPLOYMENT_DESTINATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                <optgroup label="参军／自主创业">
                  {EMPLOYMENT_SERVICE_DESTINATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </optgroup>
              </>
            ) : (
              <>
                <option value={INTERN_DEST_LABEL}>{INTERN_DEST_LABEL}</option>
                <option value="待实习">待实习</option>
                <option value="备考研究生">备考研究生</option>
                <option value="备考公务员">备考公务员</option>
              </>
            )}
          </select>

          <select
            id="filterDir"
            className="dd-filter-select"
            value={filterDir}
            onChange={(e) => setFilterDir(e.target.value)}
          >
            <option value="">全部实训方向</option>
            {dirFilterOptions.map((dir) => (
              <option key={dir} value={dir}>{dir}</option>
            ))}
          </select>

          {isFiltered ? (
            <button type="button" className="dd-reset-btn" onClick={clearFilters} title="恢复默认显示全部">
              <IconReset /> 清空筛选
            </button>
          ) : null}
        </div>

        {/* Table Content */}
        <div className="dd-table-container">
          {loadError ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#e11d48' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{loadError}</div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadAll()}>重试加载</button>
            </div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
              <div style={{ color: '#94a3b8', marginBottom: 12 }}><IconUsers /></div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#334155', marginBottom: 6 }}>
                {isFiltered ? '未找到符合筛选条件的学生记录' : '当前跟踪项目暂无学生档案记录'}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
                {isFiltered ? '请尝试修改或清空筛选关键词' : '可通过上方「导入 Excel」按钮批量导入，或载入示例数据体验看板效果'}
              </div>
              {!isDemoMode ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={loadDemoData}>
                  载入示例数据体验
                </button>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  重置筛选条件
                </button>
              )}
            </div>
          ) : (
            <table className="dd-table">
              <thead>
                <tr>
                  <th>姓名 / 学号</th>
                  <th>班级 / 实训方向</th>
                  <th>去向状态</th>
                  <th>{employmentMode ? '就业单位 / 岗位' : '实习单位 / 岗位'}</th>
                  <th>{employmentMode ? '上岸单位 / 岗位专业' : '考研院校 / 专业'}</th>
                  <th>创建日期</th>
                  <th>教师判定</th>
                  <th className="sticky-action">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const intern = recordHasCompany(r) ? (r.internCompany || '—') : '—';
                  const internSub = recordHasCompany(r) ? (r.internPosition || '') : '';
                  const grad = recordHasSchool(r) ? (r.gradSchool || '—') : '—';
                  const gradSub = recordHasSchool(r) ? (r.gradMajor || '') : '';

                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="dd-student-name">
                          {r.studentName || '—'}
                          {r.gender ? <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>({r.gender})</span> : null}
                        </div>
                        {r.studentId ? <span className="dd-student-id">{r.studentId}</span> : null}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.className || '—'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{r.trainingDirection || '—'}</div>
                      </td>
                      <td>
                        <DestinationBadge dest={r.destination} />
                      </td>
                      <td>
                        {recordHasCompany(r) ? (
                          <div>
                            <div className="dd-company-name">{intern}</div>
                            <div className="dd-company-sub">
                              {internSub ? <span>{internSub}</span> : null}
                              {r.internSalary ? <span className="dd-salary-tag">{salaryDisplay(r.internSalary)}</span> : null}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        {recordHasSchool(r) ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{grad}</div>
                            {gradSub ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{gradSub}</div> : null}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className="dd-created-at">{formatCreatedAt(r.createdAt) || '—'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {/* 仅展示岗位类型、明星企业、明星就业三个维度。 */}
                          {r.starStatus === '是' || r.qualityStatus === '是' ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {r.starStatus === '是' ? (
                                <span style={{
                                  fontSize: 11,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: '#fffbeb',
                                  color: '#d97706',
                                  border: '1px solid #fde68a',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}>
                                  ★ 明星就业
                                </span>
                              ) : null}
                              {r.qualityStatus === '是' ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontSize: 11,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}>
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" focusable="false">
                                    <path d="M6 1 11 10H1Z" />
                                  </svg>
                                  明星企业
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            {r.jobCategory || '待判定'}
                          </span>
                        </div>
                      </td>
                      <td className="sticky-action">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            className="dd-action-btn detail"
                            onClick={() => openDetail(r.id)}
                            title="查看详情"
                          >
                            <IconEye /> 详情
                          </button>
                          <button
                            type="button"
                            className="dd-action-btn judge"
                            onClick={() => editAssessment(r)}
                            title="教师判定"
                          >
                            <IconEdit /> 判定
                          </button>
                          <button
                            type="button"
                            className="dd-action-btn delete"
                            onClick={() => deleteRec(r.id)}
                            title="删除记录"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 6. Detail & Teacher Assessment Modal */}
      {detail ? (
        <div
          className="dd-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="dd-modal-dialog" role="dialog" aria-modal="true">
            <div className="dd-modal-header">
              <div className="dd-modal-title-wrap">
                <h3 className="dd-modal-title">{detail.studentName || '学生档案'}</h3>
                {detail.studentId ? <span className="dd-student-id">{detail.studentId}</span> : null}
                <span className="dd-count-pill">{detail.className || '班级未录入'}</span>
              </div>
              <button type="button" className="dd-modal-close-btn" onClick={closeModal} title="关闭窗口">
                <IconX />
              </button>
            </div>

            <div className="dd-modal-body">
              {editing ? (
                /* Edit Assessment Form */
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                      修改教师判定：{detail.studentName}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      当前岗位：{detail.internPosition || '—'} · 单位：{detail.internCompany || '—'}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>岗位类型</label>
                    <select
                      className="dd-filter-select"
                      style={{ width: '100%' }}
                      value={editForm.jobCategory}
                      onChange={(e) => setEditForm((f) => ({ ...f, jobCategory: e.target.value }))}
                    >
                      {CATEGORY_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label htmlFor="assessmentCompanyCategory">企业分类</label>
                    <select
                      id="assessmentCompanyCategory"
                      className="dd-filter-select"
                      style={{ width: '100%' }}
                      value={editForm.companyCategory}
                      onChange={(e) => setEditForm((f) => ({ ...f, companyCategory: e.target.value }))}
                    >
                      {COMPANY_CATEGORY_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <div className="field-hint">Ⅰ类：500强/上市；Ⅱ类：专精特新/独角兽/政府/事业；Ⅲ类：中小型IT企业；Ⅳ类：其它。未人工覆盖的就业明星随企业分类更新。</div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>是否为明星企业</label>
                    <select
                      className="dd-filter-select"
                      style={{ width: '100%' }}
                      value={editForm.qualityStatus}
                      onChange={(e) => setEditForm((f) => ({ ...f, qualityStatus: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label>是否为明星就业</label>
                    <select
                      className="dd-filter-select"
                      style={{ width: '100%' }}
                      value={editForm.starStatus}
                      onChange={(e) => setEditForm((f) => ({ ...f, starStatus: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>取消</button>
                    <button type="button" className="btn btn-primary" onClick={() => saveAssessment(detail.id)}>保存判定</button>
                  </div>
                </div>
              ) : (
                /* View Student Details */
                <div>
                  {/* Teacher Assessment Highlight Banner */}
                  <div className="dd-assessment-banner">
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
                        教师综合判定
                      </div>
                      <div className="dd-assessment-chips">
                        <span className="dd-assessment-chip highlight">岗位类型：{detail.jobCategory || '待判定'}</span>
                        <span className={`dd-assessment-chip ${detail.qualityStatus === '是' ? 'highlight' : ''}`}>
                          明星企业：{detail.qualityStatus || '待判定'}
                        </span>
                        <span className={`dd-assessment-chip ${detail.starStatus === '是' ? 'highlight' : ''}`}>
                          明星就业：{detail.starStatus || '待判定'}
                        </span>
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => editAssessment(detail)}>
                      <IconEdit /> 编辑判定
                    </button>
                  </div>

                  {/* Basic Info */}
                  <div className="dd-info-section-title">基本信息</div>
                  <div className="dd-info-grid">
                    <div className="dd-info-item">
                      <span className="dd-info-label">学生姓名</span>
                      <span className="dd-info-value">{detail.studentName || '—'}</span>
                    </div>
                    <div className="dd-info-item">
                      <span className="dd-info-label">学号</span>
                      <span className="dd-info-value">{detail.studentId || '—'}</span>
                    </div>
                    <div className="dd-info-item">
                      <span className="dd-info-label">性别</span>
                      <span className="dd-info-value">{detail.gender || '—'}</span>
                    </div>
                    <div className="dd-info-item">
                      <span className="dd-info-label">联系电话</span>
                      <span className="dd-info-value">{detail.phone || '—'}</span>
                    </div>
                    <div className="dd-info-item">
                      <span className="dd-info-label">班级</span>
                      <span className="dd-info-value">{detail.className || '—'}</span>
                    </div>
                    <div className="dd-info-item">
                      <span className="dd-info-label">实训方向</span>
                      <span className="dd-info-value">{detail.trainingDirection || '—'}</span>
                    </div>
                    <div className="dd-info-item" style={{ gridColumn: '1 / -1' }}>
                      <span className="dd-info-label">籍贯</span>
                      <span className="dd-info-value">{detail.hometown || '—'}</span>
                    </div>
                  </div>

                  {/* Internship Info */}
                  {recordHasCompany(detail) ? (
                    <>
                      <div className="dd-info-section-title">{detail.configType === '就业' ? '就业就职信息' : '实习就职信息'}</div>
                      <div className="dd-info-grid">
                        <div className="dd-info-item">
                          <span className="dd-info-label">{detail.configType === '就业' ? '就业单位名称' : '实习单位名称'}</span>
                          <span className="dd-info-value">{detail.internCompany || '—'}</span>
                        </div>
                        <div className="dd-info-item">
                          <span className="dd-info-label">{detail.configType === '就业' ? '就业岗位' : '实习岗位'}</span>
                          <span className="dd-info-value">{detail.internPosition || '—'}</span>
                        </div>
                        <div className="dd-info-item">
                          <span className="dd-info-label">{detail.configType === '就业' ? '就业月薪/待遇' : '实习月薪/待遇'}</span>
                          <span className="dd-info-value">{detail.internSalary ? salaryDisplay(detail.internSalary) : '—'}</span>
                        </div>
                        <div className="dd-info-item">
                          <span className="dd-info-label">企业分类</span>
                          <span className="dd-info-value">{detail.companyCategory || '待判定'}</span>
                        </div>
                        {detail.configType === '就业' ? (
                          <>
                            <div className="dd-info-item"><span className="dd-info-label">单位省份</span><span className="dd-info-value">{detail.employmentProvince || '—'}</span></div>
                            <div className="dd-info-item"><span className="dd-info-label">单位城市</span><span className="dd-info-value">{detail.employmentCity || '—'}</span></div>
                            <div className="dd-info-item"><span className="dd-info-label">与实习单位是否一致</span><span className="dd-info-value">{detail.sameInternCompany || '—'}</span></div>
                            <div className="dd-info-item"><span className="dd-info-label">与实习岗位是否一致</span><span className="dd-info-value">{detail.sameInternPosition || '—'}</span></div>
                          </>
                        ) : (
                          <>
                        <div className="dd-info-item">
                          <span className="dd-info-label">具体业务线</span>
                          <span className="dd-info-value">{detail.businessLine || '—'}</span>
                        </div>
                        <div className="dd-info-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="dd-info-label">实习单位具体地点</span>
                          <span className="dd-info-value">{detail.internLocation || '—'}</span>
                        </div>
                        <div className="dd-info-item">
                          <span className="dd-info-label">实习单位联系人</span>
                          <span className="dd-info-value">{detail.internContact || '—'}</span>
                        </div>
                        <div className="dd-info-item">
                          <span className="dd-info-label">联系人电话</span>
                          <span className="dd-info-value">{detail.internContactPhone || '—'}</span>
                        </div>
                        <div className="dd-info-item">
                          <span className="dd-info-label">实习入职时间</span>
                          <span className="dd-info-value">{detail.internStartDate || '—'}</span>
                        </div>
                        <div className="dd-info-item">
                          <span className="dd-info-label">实习结束时间</span>
                          <span className="dd-info-value">{detail.internEndDate || '—'}</span>
                        </div>
                          </>
                        )}
                      </div>
                    </>
                  ) : null}

                  {/* Graduate School Info */}
                  {recordHasSchool(detail) ? (
                    <>
                      <div className="dd-info-section-title">{detail.configType === '就业' ? '升学、考公成功信息' : '考研升学信息'}</div>
                      <div className="dd-info-grid">
                        <div className="dd-info-item">
                          <span className="dd-info-label">{detail.configType === '就业' ? '上岸单位/院校' : '目标院校'}</span>
                          <span className="dd-info-value">{detail.gradSchool || '—'}</span>
                        </div>
                        <div className="dd-info-item">
                          <span className="dd-info-label">{detail.configType === '就业' ? '岗位/专业' : '目标专业'}</span>
                          <span className="dd-info-value">{detail.gradMajor || '—'}</span>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {/* Remarks */}
                  {detail.remark ? (
                    <>
                      <div className="dd-info-section-title">备注说明</div>
                      <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9', color: '#334155' }}>
                        {detail.remark}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="dd-modal-footer">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {clearConfirm ? (
        <div
          className="dd-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !clearing) setClearConfirm(false); }}
        >
          <div className="dd-modal-dialog dd-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dd-clear-title">
            <div className="dd-modal-header">
              <div className="dd-modal-title-wrap">
                <h3 className="dd-modal-title" id="dd-clear-title">清空跟踪项目数据</h3>
              </div>
              <button type="button" className="dd-modal-close-btn" onClick={() => setClearConfirm(false)} disabled={clearing} title="关闭窗口">
                <IconX />
              </button>
            </div>
            <div className="dd-modal-body">
              <p className="dd-confirm-question">
                是否清除跟踪项目「<strong>{(selectedConfig || {}).title || '当前项目'}</strong>」的全部
                <strong> {records.length} </strong>条学生档案记录？
              </p>
              <p className="dd-confirm-warning">
                该操作不可恢复，清空后需要重新导入 Excel 或由学生重新填写。
              </p>
            </div>
            <div className="dd-modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setClearConfirm(false)} disabled={clearing}>
                取消
              </button>
              <button type="button" className="btn btn-danger" onClick={clearAll} disabled={clearing}>
                {clearing ? <IconSpinner /> : <IconTrash />} {clearing ? '清空中…' : '确认清空'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assessConfirm ? (
        <div
          className="dd-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !assessing) setAssessConfirm(false); }}
        >
          <div className="dd-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="dd-assess-title">
            <div className="dd-modal-header">
              <div className="dd-modal-title-wrap">
                <h3 className="dd-modal-title" id="dd-assess-title">按规则自动判定</h3>
              </div>
              <button type="button" className="dd-modal-close-btn" onClick={() => setAssessConfirm(false)} disabled={assessing} title="关闭窗口">
                <IconX />
              </button>
            </div>
            <div className="dd-modal-body">
              <p className="dd-confirm-question">
                将对跟踪项目「<strong>{(selectedConfig || {}).title || '当前项目'}</strong>」的
                <strong> {records.length} </strong>条记录套用以下规则：
              </p>
              <ul className="dd-rule-list">
                {describeRules(selectedConfig?.type).map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
              <label className="dd-rule-toggle">
                <input
                  type="checkbox"
                  checked={overwriteAssessment}
                  onChange={(e) => setOverwriteAssessment(e.target.checked)}
                  disabled={assessing}
                />
                同时覆盖已有人工判定（默认只补写仍为「待判定」的字段）
              </label>
            </div>
            <div className="dd-modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setAssessConfirm(false)} disabled={assessing}>
                取消
              </button>
              <button type="button" className="btn btn-primary" onClick={assessAll} disabled={assessing}>
                {assessing ? <IconSpinner /> : <IconSparkles />} {assessing ? '判定中…' : '开始判定'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
