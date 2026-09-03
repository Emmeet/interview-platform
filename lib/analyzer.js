/**
 * 规则分析引擎（无 AI 模型，纯词典 + 统计）
 * 提供：JD关键词提取 / 问题分类 / 高频统计 / 覆盖映射
 */

const TECH_DICT = [
  { word: 'Java', category: '技术' }, { word: 'Python', category: '技术' },
  { word: 'JavaScript', category: '技术' }, { word: 'TypeScript', category: '技术' },
  { word: 'Go', category: '技术' }, { word: 'C++', category: '技术' },
  { word: 'C#', category: '技术' }, { word: 'PHP', category: '技术' },
  { word: 'Kotlin', category: '技术' }, { word: 'Swift', category: '技术' },
  { word: 'React', category: '技术' }, { word: 'Vue', category: '技术' },
  { word: 'Angular', category: '技术' }, { word: 'Node', category: '技术' },
  { word: 'Spring', category: '技术' }, { word: 'SpringBoot', category: '技术' },
  { word: 'Django', category: '技术' }, { word: 'Flask', category: '技术' },
  { word: 'MyBatis', category: '技术' }, { word: 'MySQL', category: '技术' },
  { word: 'Redis', category: '技术' }, { word: 'MongoDB', category: '技术' },
  { word: 'PostgreSQL', category: '技术' }, { word: 'Oracle', category: '技术' },
  { word: 'SQL', category: '技术' }, { word: 'Elasticsearch', category: '技术' },
  { word: 'HTML', category: '技术' }, { word: 'CSS', category: '技术' },
  { word: 'jQuery', category: '技术' }, { word: '小程序', category: '技术' },
  { word: 'Linux', category: '技术' }, { word: 'Docker', category: '技术' },
  { word: 'Kubernetes', category: '技术' }, { word: 'Jenkins', category: '技术' },
  { word: 'Git', category: '技术' }, { word: 'Maven', category: '技术' },
  { word: '算法', category: '技术' }, { word: '数据结构', category: '技术' },
  { word: '设计模式', category: '技术' }, { word: '并发', category: '技术' },
  { word: '多线程', category: '技术' }, { word: 'JVM', category: '技术' },
  { word: '微服务', category: '技术' }, { word: '分布式', category: '技术' },
  { word: '高并发', category: '技术' }, { word: '消息队列', category: '技术' },
  { word: 'Kafka', category: '技术' }, { word: 'RabbitMQ', category: '技术' },
  { word: '机器学习', category: '技术' }, { word: '深度学习', category: '技术' },
  { word: '神经网络', category: '技术' }, { word: 'NLP', category: '技术' },
  { word: '计算机视觉', category: '技术' }, { word: '大模型', category: '技术' },
  { word: 'PyTorch', category: '技术' }, { word: 'TensorFlow', category: '技术' },
  { word: '大数据', category: '技术' }, { word: 'Hadoop', category: '技术' },
  { word: 'Spark', category: '技术' }, { word: 'Flink', category: '技术' },
  { word: '数据仓库', category: '技术' }, { word: '数据挖掘', category: '技术' },
  { word: '自动化测试', category: '技术' }, { word: '性能测试', category: '技术' },
  { word: '单元测试', category: '技术' }, { word: 'TCP', category: '技术' },
  { word: 'HTTP', category: '技术' }, { word: '操作系统', category: '技术' },
  { word: '计算机网络', category: '技术' }, { word: '编译原理', category: '技术' },
  { word: '前端', category: '技术' }, { word: '后端', category: '技术' },
  { word: '全栈', category: '技术' }, { word: '嵌入式', category: '技术' },
  { word: '运维', category: '技术' }, { word: 'DevOps', category: '技术' },
  { word: '数据分析', category: '技术' },
];

const SOFT_DICT = [
  { word: '沟通', category: '软素质' }, { word: '表达', category: '软素质' },
  { word: '团队协作', category: '软素质' }, { word: '团队合作', category: '软素质' },
  { word: '协作', category: '软素质' }, { word: '项目管理', category: '软素质' },
  { word: '学习能力', category: '软素质' }, { word: '自驱', category: '软素质' },
  { word: '抗压', category: '软素质' }, { word: '责任心', category: '软素质' },
  { word: '责任感', category: '软素质' }, { word: '创新', category: '软素质' },
  { word: '领导力', category: '软素质' }, { word: '逻辑思维', category: '软素质' },
  { word: '逻辑', category: '软素质' }, { word: '执行力', category: '软素质' },
  { word: '主动性', category: '软素质' }, { word: '适应能力', category: '软素质' },
  { word: '解决问题', category: '软素质' }, { word: '时间管理', category: '软素质' },
  { word: '跨部门', category: '软素质' }, { word: '客户导向', category: '软素质' },
  { word: '结果导向', category: '软素质' }, { word: '严谨', category: '软素质' },
  { word: '细心', category: '软素质' }, { word: '耐心', category: '软素质' },
  { word: '职业规划', category: '软素质' }, { word: '稳定性', category: '软素质' },
];

const ALL_DICT = [...TECH_DICT, ...SOFT_DICT];

const Q_TECH_HINTS = ['实现', '原理', '复杂度', '优化', '源码', '底层', '架构', '机制', '怎么设计', '如何设计', '手写', '算法题', '编程题', '八股', '区别', '为什么用', '流程'];
const Q_PROJECT_HINTS = ['项目', '做过', '介绍一下', '介绍你的', '实习', '遇到的困难', '技术方案', '负责', '角色', '职责', '亮点', '难点'];
const Q_BEHAVIOR_HINTS = ['团队合作', '冲突', '分歧', '挑战', '失败', '成功', '优点', '缺点', '为什么选', '职业规划', '离职', '加班', '压力', '最', '印象深刻', '成就感', '怎么处理', '如何沟通'];
const Q_OPEN_HINTS = ['你怎么看', '你的看法', '你的想法', '如果', '假设', '未来', '趋势', '理解', '看法', '思路'];

function norm(text) { return String(text || '').toLowerCase(); }

function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function contains(haystack, needle) {
  if (!needle) return false;
  const h = norm(haystack), n = norm(needle);
  if (/^[a-z0-9+#.]+$/i.test(needle)) {
    try { return new RegExp('\\b' + escapeReg(n) + '\\b', 'i').test(h); } catch (e) { return h.includes(n); }
  }
  return h.includes(n);
}

export function extractKeywords(text) {
  const hits = [];
  const seen = new Set();
  for (const item of ALL_DICT) {
    const key = item.word.toLowerCase();
    if (!seen.has(key) && contains(text, item.word)) {
      seen.add(key);
      hits.push({ keyword: item.word, category: item.category });
    }
  }
  return hits;
}

export function classifyQuestion(q) {
  const text = String(q || '');
  if (Q_BEHAVIOR_HINTS.some(h => contains(text, h))) return '行为类';
  if (Q_PROJECT_HINTS.some(h => contains(text, h))) return '项目深挖';
  const kw = extractKeywords(text);
  if (kw.length > 0 || Q_TECH_HINTS.some(h => contains(text, h))) return '技术类';
  if (Q_OPEN_HINTS.some(h => contains(text, h))) return '开放类';
  return '其他';
}

/**
 * 综合分析全部记录，返回看板所需数据
 */
export function analyzeAll(records) {
  const total = records.length;
  const companyMap = {};
  const positionMap = {};
  const departmentMap = {};
  const jdKwMap = {};
  const qCatMap = { '技术类': 0, '项目深挖': 0, '行为类': 0, '开放类': 0, '其他': 0 };
  const hotKwMap = {};

  for (const r of records) {
    companyMap[r.company] = (companyMap[r.company] || 0) + 1;
    const posName = r.positionStd || r.position;
    if (posName) positionMap[posName] = (positionMap[posName] || 0) + 1;
    const dept = String(r.department || '').trim();
    if (dept) departmentMap[dept] = (departmentMap[dept] || 0) + 1;

    const jdKw = extractKeywords(r.jdText);
    const jdKwWords = jdKw.map(k => k.keyword);
    for (const k of jdKw) {
      if (!jdKwMap[k.keyword]) jdKwMap[k.keyword] = { keyword: k.keyword, category: k.category, jdCount: 0, askedCount: 0 };
      jdKwMap[k.keyword].jdCount++;
    }

    const questions = Array.isArray(r.questions) ? r.questions : [];
    const allQText = questions.join(' ');
    for (const q of questions) {
      const cat = classifyQuestion(q);
      qCatMap[cat] = (qCatMap[cat] || 0) + 1;
      const qKw = extractKeywords(q);
      for (const k of qKw) {
        if (!hotKwMap[k.keyword]) hotKwMap[k.keyword] = { keyword: k.keyword, questionCount: 0, category: k.category };
        hotKwMap[k.keyword].questionCount++;
      }
    }

    for (const kw of jdKwWords) {
      if (contains(allQText, kw) && jdKwMap[kw]) jdKwMap[kw].askedCount++;
    }
  }

  return {
    totalRecords: total,
    companies: Object.keys(companyMap).map((name) => ({ name, count: companyMap[name] })).sort((a, b) => b.count - a.count),
    positions: Object.keys(positionMap).map((name) => ({ name, count: positionMap[name] })).sort((a, b) => b.count - a.count),
    departments: Object.keys(departmentMap).map((name) => ({ name, count: departmentMap[name] })).sort((a, b) => b.count - a.count),
    jdKeywords: Object.values(jdKwMap).sort((a, b) => b.jdCount - a.jdCount),
    questionCategories: Object.entries(qCatMap).map(([category, count]) => ({ category, count })),
    hotKeywords: Object.values(hotKwMap).sort((a, b) => b.questionCount - a.questionCount).slice(0, 20),
    coverage: Object.values(jdKwMap).map(k => ({ ...k, askedRate: k.jdCount > 0 ? k.askedCount / k.jdCount : 0 })).sort((a, b) => b.jdCount - a.jdCount),
  };
}
