/**
 * 学生填写的岗位名称 → 规范岗位名称
 * 保留原始 position，看板筛选/统计/展示用 positionStd
 */

const RULES = [
  { name: '测试开发工程师', re: /测试开发|开发测试|sdet/i },
  { name: '前端开发工程师', re: /前端|front\s*-?end|frontend|web前端/i },
  { name: 'Android开发工程师', re: /安卓|android/i },
  { name: 'iOS开发工程师', re: /\bios\b|苹果开发|ios开发/i },
  { name: 'Python开发工程师', re: /python/i },
  { name: 'Go开发工程师', re: /\bgo\b|golang/i },
  { name: 'Java全栈开发工程师', re: /全栈/i, extra: /java/i },
  { name: '全栈开发工程师', re: /全栈/i },
  { name: 'Java开发工程师', re: /java/i },
  { name: '后端开发工程师', re: /后端|服务端|后台开发/i },
  { name: '实施工程师', re: /实施|交付实施|项目实施/i },
  { name: '技术支持工程师', re: /技术支持|售后|运维支持|客户支持/i },
  { name: '运维工程师', re: /运维|devops|sre/i },
  { name: '软件测试工程师', re: /测试|qa\b|quality\s*assurance|软件测试/i },
  { name: '算法工程师', re: /算法|机器学习|深度学习|人工智能|\bai\b/i },
  { name: '数据分析师', re: /数据分析|数据开发|数仓|大数据/i },
  { name: 'UI设计师', re: /\bui\b|ux|视觉设计|平面设计|设计师/i },
  { name: '嵌入式开发工程师', re: /嵌入式|单片机|固件/i },
  { name: '网络工程师', re: /网络工程师|网络运维|网管/i },
  { name: '产品经理', re: /产品经理|pm\b/i },
  { name: '产品助理', re: /产品/i },
  { name: '直播运营助理', re: /直播/i },
  { name: '教学助理', re: /教学|教务|助教/i },
  { name: '运营专员', re: /运营/i },
  { name: '软件开发工程师', re: /开发|软件工程|程序员|研发/i },
];

function prettyTech(s) {
  return String(s || '')
    .replace(/javascript/gi, 'JavaScript')
    .replace(/java/gi, 'Java')
    .replace(/python/gi, 'Python')
    .replace(/android/gi, 'Android')
    .replace(/\bios\b/gi, 'iOS')
    .replace(/\bui\b/gi, 'UI')
    .replace(/\bqa\b/gi, 'QA')
    .replace(/golang/gi, 'Go');
}

/** 去掉实习标签、届别、部门前缀、末尾「岗位」等噪声 */
export function cleanPosition(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/[\u3000]/g, ' ');
  s = s.replace(/【[^】]*】/g, '');
  s = s.replace(/\d{4}\s*届/g, '');
  s = s.replace(/[（(][^）)]*(实习|校招|应届|兼职|intern)[^）)]*[）)]/gi, '');
  s = s.replace(/实习[生员]?/g, '');
  s = s.replace(/应届生?|校招生?|社招/g, '');
  s = s.replace(/^(初级|中级|高级|资深)/, '');
  s = s.replace(/岗位$/g, '');
  s = s.replace(/\s+/g, '');
  const parts = s.split(/[-—–—/|]/).map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1 && /部|组|中心|院|处|bu|事业|团队/i.test(parts[0])) {
    s = parts.slice(1).join('');
  }
  return s.trim();
}

/**
 * @param {string} raw 学生填写的岗位
 * @returns {string} 规范岗位名称；无法识别时返回清理后的原文
 */
export function normalizePosition(raw) {
  const original = String(raw || '').trim();
  if (!original) return '';
  const s = cleanPosition(original);
  if (!s) return original;

  for (const rule of RULES) {
    if (rule.extra && !rule.extra.test(s)) continue;
    if (rule.re && rule.re.test(s)) return rule.name;
  }

  if (/工程师|专员|助理|经理|顾问|分析师|设计师|研究员|运营$/.test(s)) {
    return prettyTech(s);
  }
  return prettyTech(s);
}

export function withStandardPosition(record) {
  const position = record && record.position ? String(record.position) : '';
  return {
    ...record,
    position,
    positionStd: normalizePosition(position),
  };
}
