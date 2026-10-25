import { policyAnswer } from './policies'
// 考公 AI 智能体：意图识别 + 考生画像 + 结构化解题 / 讲解 / 规划 + 个性化错因分析
// 已接入 GitHub 开源「考公 AI 导师」skill（KeWang0622/kaogong-skill）的人设与解题方法论
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import type {
  AIConfig,
  DailyTask,
  QuestionBankItem,
  StudyGoal,
  StudySession,
  TodoItem,
  WrongQuestion,
} from '@/types'
import { formatDuration } from '@/lib/format'

export type SuggestionLevel = 'warn' | 'tip' | 'good'

export interface Suggestion {
  id: string
  level: SuggestionLevel
  text: string
}

/**
 * 考公 AI 导师的 system prompt（取自 GitHub 开源 skill：KeWang0622/kaogong-skill）
 * 覆盖国考 / 省考 / 联考，行测 6 模块 + 申论 + 面试，含评分标准与应试策略。
 */
export const KAOGONG_SYSTEM_PROMPT = `你是一位经验丰富的公务员考试辅导老师（考公 AI 导师），熟悉国家公务员考试（国考）、各省省考及事业单位联考的全部题型、评分标准与应试策略。你的任务是帮助用户高效备考，用科学的方法提高成绩。

【基本原则】
1. 准确性第一：所有题型分类、评分标准、时间安排必须严格对标真实考试。
2. 鼓励但务实：给予正面反馈的同时指出不足，不给虚假承诺。
3. 因材施教：根据用户水平、错题画像调整难度和策略。
4. 解题重于刷题：每道题都要讲清思路和方法论，授人以渔。
5. 不承诺分数和结果：考试有不确定性，只帮助用户最大化准备效果。
6. 没有实时检索工具，不得声称已核验最新政策、时政或职位资格；先询问考试年度、地区和岗位，只引用已提供且适用的来源，不编造链接。不完整的题干和选项应先要求补全。

【知识体系】
- 行测 6 大模块：政治理论、言语理解与表达（逻辑填空/片段阅读/语句表达）、数量关系（数字推理/数学运算）、判断推理（图形推理/定义判断/类比推理/逻辑判断）、资料分析（基期/增长率/比重/倍数）、常识判断。
- 申论：归纳概括、综合分析、提出对策、公文应用文、大作文（五段三分式）。
- 面试：结构化面试（综合分析/组织管理/应急应变/人际/言语表达）。
- 时政：两会、中央经济工作会议、新质生产力等核心表述。

【解题方法论参考（花生十三体系）】
- 资料分析：截位直除、415 份数法、ABRX 体系、假设分配法，目标 20 题/15 分钟。
- 数量关系：工程/行程/利润/排列组合/容斥/最值/年龄/几何的赋值法与套路。
- 言语：逻辑填空做语境分析（对应关系/感情色彩/语义轻重），片段阅读抓主旨与意图。
- 判断：图形推理记规律体系，定义判断用要素法，类比推理分层级，逻辑判断掌握翻译推理与加强削弱。

【答题格式】回答要结构清晰、分点、可操作；解题题先给『题型判定 → 考点 → 解题思路 → 关键步骤 → 易错点 → 同类题秒杀』，再给最终答案。语言：亲切、专业的中文。`

// —— 意图识别 ——
export type AgentIntent =
  | 'solve' // 解一道具体题
  | 'explain' // 讲解某个知识点 / 方法
  | 'plan' // 备考规划 / 倒计时 / 零基础起步
  | 'wrong' // 错题分析 / 复盘
  | 'interview' // 面试
  | 'shenlun' // 申论
  | 'current' // 时政
  | 'method' // 行测某模块方法
  | 'faq' // 考公百科：流程 / 报名 / 科目分值 / 资料推荐等
  | 'general'

export interface IntentResult {
  intent: AgentIntent
  subject?: string
}

const SUBJECT_KEYWORDS: { subject: string; kw: string[] }[] = [
  {
    subject: '资料分析',
    kw: ['资料分析', '基期', '增长率', '比重', '截位直除', '415份数', '倍数'],
  },
  {
    subject: '言语理解与表达',
    kw: ['言语', '逻辑填空', '片段阅读', '语句排序', '主旨', '意图'],
  },
  {
    subject: '判断推理',
    kw: [
      '判断推理',
      '图形推理',
      '定义判断',
      '类比推理',
      '逻辑判断',
      '加强削弱',
      '翻译推理',
    ],
  },
  {
    subject: '数量关系',
    kw: [
      '数量关系',
      '数学运算',
      '工程问题',
      '行程',
      '利润',
      '排列组合',
      '容斥',
    ],
  },
  { subject: '政治理论', kw: ['政治理论'] },
  { subject: '常识判断', kw: ['常识判断', '常识'] },
  {
    subject: '申论',
    kw: ['申论', '归纳概括', '综合分析', '提出对策', '公文', '大作文', '作文'],
  },
  { subject: '面试', kw: ['面试', '结构化', '应急应变', '组织管理', '人际'] },
  { subject: '时政', kw: ['时政', '两会', '新质生产力', '中央经济工作会议'] },
]

export function detectIntent(q: string): IntentResult {
  const s = q.toLowerCase()
  const has = (...k: string[]) => k.some((x) => s.includes(x))
  for (const row of SUBJECT_KEYWORDS) {
    if (row.kw.some((k) => s.includes(k)))
      return { intent: pickIntent(s, row.subject), subject: row.subject }
  }
  if (has('错题', '复盘', '错因', '为什么错')) return { intent: 'wrong' }
  if (has('面试')) return { intent: 'interview' }
  if (has('申论', '作文', '大作文')) return { intent: 'shenlun' }
  if (has('时政', '新质生产力', '两会', '中央经济工作会议'))
    return { intent: 'current' }
  // 考公百科：流程 / 报名 / 条件 / 科目分值 / 选岗 / 资料
  if (
    has(
      '流程',
      '怎么报名',
      '如何报名',
      '报名',
      '报考条件',
      '报名条件',
      '要求',
      '学历',
      '年龄限制',
      '年龄',
      '考什么',
      '科目',
      '分值',
      '题量',
      '时间分配',
      '国考省考',
      '省考国考',
      '区别',
      '选岗',
      '报名费',
      '资格复审',
      '考公是什么',
      '什么是考公',
      '公务员',
    )
  )
    return { intent: 'faq' }
  if (
    has(
      '资料',
      '教材',
      '书',
      '网课',
      '推荐',
      'app',
      '刷题软件',
      '跟谁学',
      '老师',
      '看谁',
      '买什么',
    )
  )
    return { intent: 'faq' }
  // 备考规划 / 零基础起步 / 时间表
  if (
    has(
      '零基础',
      '怎么开始',
      '如何开始',
      '起步',
      '入门',
      '小白',
      '第一次',
      '刚开始',
      '基础差',
      '计划',
      '安排',
      '路线',
      '怎么学',
      '如何备考',
      '规划',
      '倒计时',
      '还剩',
      '每天学',
      '时间表',
      '时间规划',
      '节奏',
    )
  )
    return { intent: 'plan' }
  if (has('解', '算', '选', '这道题', '答案', '求', '问', '？', '?'))
    return { intent: 'solve' }
  return { intent: 'general' }
}

function pickIntent(s: string, subject: string): AgentIntent {
  if (subject === '面试') return 'interview'
  if (subject === '申论') return 'shenlun'
  if (subject === '时政') return 'current'
  if (
    s.includes('解') ||
    s.includes('算') ||
    s.includes('求') ||
    s.includes('答案') ||
    s.includes('这道题') ||
    s.includes('？') ||
    s.includes('?')
  )
    return 'solve'
  return 'method'
}

// —— 考生画像（用于个性化答疑与建议） ——
function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const m: Record<string, number> = {}
  for (const x of arr) m[key(x)] = (m[key(x)] ?? 0) + 1
  return m
}

export function buildProfile(data: {
  wrongQuestions: WrongQuestion[]
  sessions: StudySession[]
  goal: StudyGoal
}): string {
  const { wrongQuestions, sessions, goal } = data
  const parts: string[] = []
  const totalWrong = wrongQuestions.length
  if (totalWrong > 0) {
    const byReason = countBy(wrongQuestions, (w) => w.whyWrong)
    const bySubject = countBy(wrongQuestions, (w) => w.subject)
    const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0]
    const topSubject = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]
    parts.push(
      `错题本共 ${totalWrong} 题；主要错因：${topReason[0]}（${topReason[1]} 题）；最薄弱科目：${topSubject[0]}（${topSubject[1]} 题）。`,
    )
    parts.push(
      `错因分布：${Object.entries(byReason)
        .map(([k, v]) => `${k} ${v}`)
        .join('、')}。`,
    )
  } else {
    parts.push('错题本暂无记录。')
  }

  // 行测模块练习时长（找最弱模块）
  const xingce = [
    '政治理论',
    '言语理解与表达',
    '数量关系',
    '判断推理',
    '资料分析',
    '常识判断',
  ]
  const subjSum: Record<string, number> = {}
  for (const ssn of sessions)
    subjSum[ssn.subject] = (subjSum[ssn.subject] ?? 0) + ssn.duration
  const weak = xingce
    .filter((m) => (subjSum[m] ?? 0) > 0)
    .sort((a, b) => (subjSum[a] ?? 0) - (subjSum[b] ?? 0))[0]
  if (weak)
    parts.push(
      `行测练习最少的模块是「${weak}」（约 ${Math.round((subjSum[weak] ?? 0) / 60)} 小时）。`,
    )
  const untouched = xingce.filter((m) => !(subjSum[m] ?? 0))
  if (untouched.length)
    parts.push(`还没练过的行测模块：${untouched.join('、')}。`)

  if (goal.examDate) {
    const days = differenceInCalendarDays(parseISO(goal.examDate), new Date())
    parts.push(
      days >= 0
        ? `距离目标考试日（${goal.examDate}）还有 ${days} 天。`
        : `目标考试日（${goal.examDate}）已过。`,
    )
  }
  if (goal.dailyMinutes > 0)
    parts.push(
      `每日目标 ${goal.dailyMinutes} 分钟，每周 ${goal.weeklyDays} 天。`,
    )
  return parts.join('\n')
}

/** 在题库中按题干匹配用户粘贴的具体题目 */
function matchBank(
  question: string,
  bank: QuestionBankItem[],
): QuestionBankItem | null {
  const norm = (s: string) =>
    s.normalize('NFKC').replace(/\s+/g, '').toLowerCase()
  const q = norm(question)
  return (
    bank.find(
      (item) => q === norm(item.question + (item.options?.join('\n') ?? '')),
    ) ?? null
  )
}

const SUBJECT_METHOD: Record<string, string> = {
  政治理论:
    '按对应年度官方大纲准备政治理论，结合权威原文理解基本概念，记录来源与发布日期。',
  资料分析:
    '资料分析提分最快，核心是『速算』：① 截位直除——选项差距大截两位、小截三位；② 415 份数法——见到 1/4、1/7、1/15 等特征快速化除为乘；③ 基期=现期÷(1+r)、增长率=(现期-基期)/基期、比重=部分/整体。目标 20 题控制在 15 分钟内，先看问题再找数据，别精算。',
  言语理解与表达:
    '言语理解两块：逻辑填空靠『语境分析』——找对应关系（解释/并列/转折）、辨感情色彩与语义轻重，别只看语感；片段阅读抓『主旨/意图』，重点看首尾句、转折词、因果词后的内容，选项要『主旨+适度推断』而非过度引申。',
  判断推理:
    '判断推理：图形推理记『规律体系』——位置、样式、属性、数量、特殊（折纸/三视图）；定义判断用『要素法』（主体+方式+目的+结果）逐一比对；类比推理分层级（语义/逻辑/语法）先横向后纵向；逻辑判断重点掌握『翻译推理』（如果…就…、只有…才…）和『加强削弱』（找论点论据、看搭桥/拆桥）。',
  数量关系:
    '数量关系性价比看目标：想冲高分就系统学，求稳则『挑 3~5 道简单题做对、其余蒙同选项』。常用套路：工程问题用赋值法（设总量为公倍数）、行程用 S=vt 与比例、利润用利润=售价-成本、排列组合用分类分步、容斥用公式 A+B-AB。',
  常识判断:
    '常识判断靠日常积累+时政：宪法国家机构、党史、科技成就、生活常识是高频；时政部分关注两会政府工作报告、中央经济工作会议、新质生产力等。不建议专门刷常识，利用碎片时间看「时政」模块和新闻即可。',
  申论: '申论核心在『踩点给分』：① 归纳概括——抄材料、分条列点、总括词+展开，不评不议；② 综合分析——是什么→为什么→怎么办；③ 提出对策——问题反推+经验借鉴；④ 公文题——注意格式（标题/称谓/落款）与文种语气；⑤ 大作文用『五段三分式』：引论+3 分论点+结论。每周至少 2 小题+1 大作文并批改。',
  面试: '结构化面试按题型答题：综合分析（表态→析因→对策→升华）、组织管理（调研→方案→实施→总结）、应急应变（控场→处理→反馈→预防）、人际（反思→沟通→解决→提升）。关键是『有框架不套话、结合岗位、条理清晰、眼神交流』。',
  时政: '时政重点：① 两会《政府工作报告》的 GDP 目标、就业、赤字率等核心数字；② 中央经济工作会议定调（如『稳中求进』『新质生产力』）；③ 新质生产力=科技创新驱动、高科技高效能高质量；④ 重大科技成就与民生政策。建议每月固定刷一轮，记关键数字和表述。',
}

// —— 考公百科知识库（本地答疑用，无需联网）——
interface FaqItem {
  k: string[] // 触发关键词
  a: string // 回答
}
const FAQ: FaqItem[] = [
  {
    k: [
      '考公是什么',
      '什么是考公',
      '公务员',
      '流程',
      '怎么报名',
      '如何报名',
      '报名条件',
      '报考条件',
      '要求',
      '学历',
      '年龄',
      '年龄限制',
    ],
    a: '【考公入门】国考招录中央机关及直属机构，省考招录相应地方机关；选调和事业单位有各自招录规则，不混用资格条件。一般流程包括查询公告与职位、报名、资格审查、缴费、考试、考察及录用公示。具体日期、条件和程序以对应年度地区公告为准。',
  },
  {
    k: ['国考省考', '省考国考', '区别', '选岗', '报哪个', '国考好还是省考'],
    a: '【国考 vs 省考】国考和省考对应不同招录机关及职位。户籍、生源、应届、专业和经历限制须逐项核查职位表，不能推定某省所有岗位统一限制。先明确发展地区和自身条件，再核对公告与岗位；本地助手不作资格认定。',
  },
  {
    k: [
      '考什么',
      '科目',
      '分值',
      '题量',
      '行测',
      '申论',
      '时间分配',
      '多少题',
      '满分',
    ],
    a: '【笔试准备】先明确年度与地区，再查官方大纲的科目、题量和时限。2026国考行测练习分类包含政治理论、常识、言语、数量、判断、资料分析；不代表各省或其他年度安排。各模块用时只是个人练习策略，应通过限时模拟调整，而不是固定评分标准。来源：https://www.forestry.gov.cn/c/www/gsgg/645383.jhtml 。',
  },
  {
    k: [
      '资料',
      '教材',
      '书',
      '网课',
      '推荐',
      'app',
      '刷题软件',
      '跟谁学',
      '老师',
      '看谁',
      '买什么',
    ],
    a: '【资料 & 老师推荐】\n· 教材：粉笔/华图/中公的《行测》《申论》系统讲义打底即可，不必都买。\n· 模块提分：资料分析看「花生十三」、判断推理看「花生十三/钩不了沉」、言语看「欣说言语/小宝」、数量看「齐麟/花生十三」、申论看「站长申论/张小龙」。\n· 刷题：粉笔APP（真题卷+智能批改+模考大赛）、华图在线。\n· 时政：学习强国 + 每月看《政府工作报告》《中央经济工作会议》要点。\n提醒：资料在精不在多，一个老师的体系吃透胜过到处囤课；押题卷当模拟即可，别迷信。',
  },
  {
    k: [
      '零基础',
      '怎么开始',
      '如何开始',
      '起步',
      '入门',
      '小白',
      '第一次',
      '刚开始',
      '基础差',
    ],
    a: '【零基础怎么起步】别一上来就刷题，按三阶段走：\n① 打基础（4-6周）：先用系统教材过一遍行测6模块+申论的方法论，知道每类题「考点和套路」是什么。\n② 专项突破（6-8周）：用题库限时刷弱项（资料分析先冲速度），每道错题归档到错题本，问自己「考点/为什么错/怎么秒杀」。\n③ 套卷冲刺（4周）：每天一套真题、严格限时、复盘到每道题，参加粉笔模考找排名。\n每天3-5小时、保持5-6天/周，比突击更稳。先把今天的目标定小一点：搞懂「资料分析截位直除」这一招就值了。',
  },
  {
    k: ['选岗', '报名费', '资格复审', '政审', '体检'],
    a: '【选岗与后续环节】按对应年度职位表核对专业、学历、应届身份等条件，不能只凭竞争人数判断适合。报名费用、复审、体检和考察的具体范围按招录公告及适用规定核查；对个人情况应咨询招录机关，不由本站作结论。',
  },
]

/** 在知识库里匹配用户问题，返回最相关的回答；无匹配返回 null */
export function matchFAQ(q: string): string | null {
  const s = q.toLowerCase()
  let best: { score: number; a: string } | null = null
  for (const item of FAQ) {
    let score = 0
    for (const kw of item.k)
      if (s.includes(kw.toLowerCase())) score += kw.length
    if (score > 0 && (!best || score > best.score)) best = { score, a: item.a }
  }
  return best?.a ?? null
}

/** 通用兜底：给出有用且个性化的方向，绝不退回静态菜单 */
function generalAnswer(_q: string, profile?: string): string {
  const base =
    '你提到的内容我先在本地帮你梳理方向。考公提分的核心是三件事做扎实：\n① 行测按模块学方法——资料分析先求「快」（截位直除/415份数）、判断推理背规律体系、言语抓主旨意图；\n② 申论每题亲自动笔写，再对照参考答案改；\n③ 错题用「当天→第2天→第7天→第15天」间隔回做。\n\n为了给你更精准的解答，可以告诉我：\n· 想攻哪个模块 / 哪类题（把题干或具体方法发我，例如「资料分析怎么提速」）；\n· 想做几天的备考计划（直接说「帮我做计划」即可）；\n· 或去「错题分析」看你的错因分布。\n\n在「设置」里接入兼容 OpenAI 的大模型（如 DeepSeek / 通义千问）后，我能逐步推理、协助分析你发来的题目，结果需核对。'
  return profile
    ? base + `\n\n参考你的画像：\n${profile.split('\n').slice(0, 2).join('\n')}`
    : base
}

/**
 * 本地智能体答疑（无需联网）：意图路由 + 题库解题 + 个性化画像。
 * 配置好大模型后由 callLLM 接管，能力更强。
 */
export function localAnswer(
  question: string,
  ctx?: { profile?: string; bank?: QuestionBankItem[] },
): string {
  const policy = policyAnswer(question)
  if (policy) return policy
  const intent = detectIntent(question)
  const profile = ctx?.profile
  const bank = ctx?.bank ?? []

  // 1) 解具体题：先尝试在题库里匹配（命中则给完整解题）
  if (intent.intent === 'solve') {
    const hit = matchBank(question, bank)
    if (hit) {
      return `【题库参考】\n题型 / 考点：${hit.subject} · ${hit.knowledgePoint ?? hit.type}\n\n解题思路：\n${hit.analysis}\n\n已录入参考答案（需核对）：${hit.answer}\n\n${
        profile
          ? '🔎 关联你的薄弱点：\n' +
            profile.split('\n').slice(0, 2).join('\n') +
            '\n'
          : ''
      }下一步：把同类题限时重做一遍，确认真懂。`
    }
    const subj = intent.subject
    if (subj && SUBJECT_METHOD[subj]) {
      return `这道题我先在本地帮你定位方法（把完整题干粘贴给我，或在「题库」里刷同类题会更准）：\n\n${SUBJECT_METHOD[subj]}\n\n如果你想让我『解这一道具体题』，请把题干（和选项，如果是选择题）一起发给我；配置好大模型（设置页）后我还能逐步推理给出参考分析，答案仍须独立核对。`
    }
    return '请把这道题的完整题干（选择题加上选项）发给我，我帮你按『题型→考点→思路→步骤→易错点』拆解；或去「题库」直接刷同类真题看解析。配置好 AI 接口后，我也能调用大模型逐题推理。'
  }

  // 2) 讲解知识点 / 模块方法
  if (intent.intent === 'explain' || intent.intent === 'method') {
    const subj = intent.subject
    if (subj && SUBJECT_METHOD[subj]) {
      let ans = SUBJECT_METHOD[subj]
      if (profile)
        ans += `\n\n📌 结合你的画像：\n${profile.split('\n').slice(0, 2).join('\n')}`
      return ans
    }
  }

  // 3) 错题分析 / 复盘
  if (intent.intent === 'wrong') {
    if (profile) {
      return `根据你的错题画像，我这样分析：\n${profile}\n\n🛠 错题复盘「三问法」：① 这道题考点是什么？② 我当时为什么错（对照上面的错因）？③ 同类题怎么秒杀？\n按『当天→第2天→第7天→第15天』间隔重复回做，把错题按模块归类。去「错题分析」页能看到错因分布与提升方案。`
    }
    return '错题复盘用『三问法』：这道题考点是什么？我当时为什么错（知识盲区/审题/计算）？同类题怎么秒杀？把错题按模块归类，用『当天→第2天→第7天→第15天』间隔重复回做。本站的「错题分析」页可一键看错因分布并生成提升方案。'
  }

  // 4) 备考规划 / 倒计时
  if (intent.intent === 'plan') {
    let ans =
      '考公备考三阶段：① 打基础（2~3 月）——按行测 6 模块 + 申论系统学方法论；② 专项突破（1~2 月）——用「题库」限时刷弱项、整理错题本；③ 套卷冲刺（1 月）——每天一套真题、严格限时、复盘到每道题。在「设置」里填目标考试日，看板会显示倒计时并提醒你进入模考节奏。'
    if (profile) ans += `\n\n🎯 结合你的画像：\n${profile}`
    return ans
  }

  // 5) 申论 / 面试 / 时政 兜底
  if (intent.intent === 'shenlun' && SUBJECT_METHOD['申论'])
    return SUBJECT_METHOD['申论']
  if (intent.intent === 'interview' && SUBJECT_METHOD['面试'])
    return SUBJECT_METHOD['面试']
  if (intent.intent === 'current' && SUBJECT_METHOD['时政'])
    return SUBJECT_METHOD['时政']

  // 6) 考公百科（流程 / 报名 / 科目分值 / 资料等）
  if (intent.intent === 'faq') {
    const ans = matchFAQ(question)
    if (ans) {
      return profile
        ? ans +
            `\n\n参考你的画像：\n${profile.split('\n').slice(0, 2).join('\n')}`
        : ans
    }
  }

  // 7) 通用兜底：给出有用方向，绝不退回静态菜单
  return generalAnswer(question, profile)
}

/** 常用提问示例（智能体快捷入口） */
export const SUGGESTED_PROMPTS = [
  '帮我做一份 30 天冲刺备考计划',
  '资料分析怎么提速到 15 分钟 20 题？',
  '分析我的错题并给出提升方案',
  '这道面试题怎么答：刚入职领导交给你不熟悉的紧急任务',
  '申论大作文五段三分式怎么写？',
  '时政要重点背哪些？',
]

/** 调用兼容 OpenAI 的接口（可选），把考生画像注入 system prompt */
export async function callLLM(
  config: AIConfig,
  messages: { role: 'user' | 'assistant'; content: string }[],
  profile?: string,
  signal?: AbortSignal,
  maxTokens = 600,
): Promise<string> {
  const endpoint = new URL(config.endpoint)
  if (
    endpoint.protocol !== 'https:' &&
    !(
      endpoint.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)
    )
  )
    throw new Error('远程模型必须使用HTTPS')
  if (
    endpoint.username ||
    endpoint.password ||
    !config.apiKey.trim() ||
    !config.model.trim()
  )
    throw new Error('模型配置不完整')
  const system =
    KAOGONG_SYSTEM_PROMPT +
    (config.shareProfile && profile
      ? '\n【用户允许分享的学习画像】\n' + profile.slice(0, 1600)
      : '')
  const bounded = messages
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
  while (
    bounded.length > 1 &&
    bounded.reduce((sum, m) => sum + m.content.length, 0) > 16000
  )
    bounded.shift()
  const controller = new AbortController(),
    abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 15000)
  try {
    const res = await fetch(endpoint.href, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.apiKey,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: system }, ...bounded],
        max_tokens: maxTokens,
      }),
    })
    if (!res.ok) throw new Error('模型接口返回HTTP ' + res.status)
    const reader = res.body?.getReader()
    if (!reader) throw new Error('模型响应为空')
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 65536) {
        await reader.cancel()
        throw new Error('模型响应超过限制')
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    const content = JSON.parse(new TextDecoder().decode(bytes))?.choices?.[0]
      ?.message?.content
    if (typeof content !== 'string' || !content.trim() || content.length > 8000)
      throw new Error('模型未返回有效文本')
    return content.trim()
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

export async function testConnection(
  config: AIConfig,
): Promise<{ ok: boolean; message: string }> {
  try {
    await callLLM(
      config,
      [{ role: 'user', content: 'ping' }],
      undefined,
      undefined,
      8,
    )
    return { ok: true, message: '收到有效文本回复；这不代表答题正确率已验证' }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : '连接失败' }
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// —— 实时建议（基于数据；错因分析用 wrongQuestions） ——
export function buildSuggestions(
  sessions: StudySession[],
  todos: TodoItem[],
  dailyTasks: DailyTask[],
  goal: StudyGoal,
  wrongQuestions: WrongQuestion[] = [],
): Suggestion[] {
  const out: Suggestion[] = []
  const today = new Date()
  const todayKey = format(today, 'yyyy-MM-dd')
  const hour = today.getHours()

  const todayMinutes = sessions
    .filter((s) => s.date === todayKey)
    .reduce((a, s) => a + s.duration, 0)

  if (goal.examDate) {
    const days = differenceInCalendarDays(parseISO(goal.examDate), today)
    if (days >= 0) {
      out.push({
        id: 'exam',
        level: days <= 30 ? 'warn' : 'tip',
        text:
          days === 0
            ? '⏰ 今天就是模考 / 笔试日，稳住心态，正常发挥就是胜利！'
            : `距离模考 / 笔试还有 ${days} 天，建议进入「套卷 + 模考节奏」阶段，每天一套限时真题。`,
      })
    } else {
      out.push({
        id: 'exam',
        level: 'tip',
        text: `目标考试日（${goal.examDate}）已过，记得在「设置」里更新下一阶段的目标日期。`,
      })
    }
  }

  const overdue = todos.filter(
    (t) => t.status !== 'done' && t.targetDate && t.targetDate < todayKey,
  )
  if (overdue.length > 0) {
    out.push({
      id: 'overdue',
      level: 'warn',
      text: `有 ${overdue.length} 个考点目标日期已逾期（如「${overdue[0].title}」），建议优先推进或调整计划。`,
    })
  }

  const xingce = [
    '政治理论',
    '言语理解与表达',
    '数量关系',
    '判断推理',
    '资料分析',
    '常识判断',
  ]
  const subjSum = new Map<string, number>()
  for (const s of sessions)
    subjSum.set(s.subject, (subjSum.get(s.subject) ?? 0) + s.duration)
  const touched = xingce.filter((m) => (subjSum.get(m) ?? 0) > 0)
  if (touched.length > 0 && touched.length < xingce.length) {
    const missing = xingce.filter((m) => !touched.includes(m))
    out.push({
      id: 'xingce',
      level: 'tip',
      text: `行测 6 模块里你还没练到：${missing.join('、')}。行测要均衡，别让弱模块拖总分。`,
    })
  }

  const shenlun = sessions.filter((s) => s.subject === '申论').length
  if (shenlun === 0) {
    out.push({
      id: 'shenlun',
      level: 'warn',
      text: '还没有任何申论练习记录。申论靠『动手写+批改』提分，建议每周至少 2 篇小题 + 1 篇大作文。',
    })
  }

  const last7Days = new Set(
    sessions
      .filter((s) => differenceInCalendarDays(today, parseISO(s.date)) < 7)
      .map((s) => s.date),
  )
  if (goal.weeklyDays && last7Days.size < goal.weeklyDays) {
    out.push({
      id: 'weekly',
      level: 'warn',
      text: `本周已学习 ${last7Days.size} 天，距每周 ${goal.weeklyDays} 天目标还差 ${
        goal.weeklyDays - last7Days.size
      } 天，考公拼的是持续投入，别断更。`,
    })
  }

  if (goal.dailyMinutes > 0 && todayMinutes < goal.dailyMinutes && hour >= 19) {
    out.push({
      id: 'today',
      level: 'warn',
      text: `今天还差 ${formatDuration(goal.dailyMinutes - todayMinutes)} 才达标，趁现在补一段专注学习。`,
    })
  }

  const todayTasks = dailyTasks.filter((t) => t.date === todayKey && !t.done)
  if (todayTasks.length > 0) {
    out.push({
      id: 'dailytask',
      level: 'tip',
      text: `今天还有 ${todayTasks.length} 项每日备考任务没完成，例如「${todayTasks[0].title}」。`,
    })
  }

  if (wrongQuestions.length > 0) {
    const byReason = countBy(wrongQuestions, (w) => w.whyWrong)
    const top = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0]
    out.push({
      id: 'wrong',
      level: top[0] === '审题失误' || top[0] === '计算错误' ? 'warn' : 'tip',
      text: `错题本已有 ${wrongQuestions.length} 题，最大错因是「${top[0]}」(${top[1]} 题)。去「错题分析」看分布并生成提升方案，用间隔重复回做。`,
    })
  }

  if (out.length === 0) {
    out.push({
      id: 'good',
      level: 'good',
      text: '目前各项指标都很健康，保持节奏，记得用「专注模式」减少切出、用「题库」做限时刷题。',
    })
  }

  return out
}
