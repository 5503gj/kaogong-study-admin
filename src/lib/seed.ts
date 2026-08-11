// 首次启动时填充的演示数据，让看板不至于空空如也（可随时在「设置」里清空）
// 领域已改为「考公备考」：行测 5 模块 + 申论 + 面试 + 时政
import { format, subDays } from "date-fns"
import type { DailyTask, StudySession, TodoItem, WrongQuestion } from "@/types"
import { uid } from "@/lib/storage"

const SUBJECTS = [
  "言语理解与表达",
  "数量关系",
  "判断推理",
  "资料分析",
  "常识判断",
  "申论",
  "面试",
  "时政",
]
const TITLES = [
  "刷行测真题",
  "看申论范文",
  "背时政要点",
  "做模拟套卷",
  "整理错题本",
  "跟解题技巧课",
  "面试模拟练习",
  "复盘套卷",
]

export function buildSeed(): {
  sessions: StudySession[]
  todos: TodoItem[]
  dailyTasks: DailyTask[]
  wrongQuestions: WrongQuestion[]
} {
  const sessions: StudySession[] = []
  let created = Date.now()
  for (let i = 0; i < 30; i++) {
    const day = subDays(new Date(), i)
    if (i % 7 === 6) continue // 偶尔休息一天
    const count = 1 + (i % 2)
    for (let j = 0; j < count; j++) {
      const subject = SUBJECTS[(i + j) % SUBJECTS.length]
      const duration = 30 + ((i * 7 + j * 13) % 90) // 30~120 分钟
      sessions.push({
        id: uid(),
        date: format(day, "yyyy-MM-dd"),
        subject,
        title: TITLES[(i + j) % TITLES.length],
        duration,
        status: "completed",
        rating: 3 + (j % 3),
        notes: "",
        createdAt: created++,
      })
    }
  }

  const todos: TodoItem[] = [
    {
      id: uid(),
      subject: "言语理解与表达",
      title: "掌握逻辑填空的语境分析与词语辨析",
      priority: "high",
      status: "doing",
      targetDate: format(subDays(new Date(), -3), "yyyy-MM-dd"),
      notes: "重点：逻辑填空的对应关系、感情色彩、语义轻重",
      createdAt: created++,
    },
    {
      id: uid(),
      subject: "资料分析",
      title: "练熟截位直除与 415 份数法，目标 20 题/15 分钟",
      priority: "high",
      status: "todo",
      targetDate: format(subDays(new Date(), -7), "yyyy-MM-dd"),
      notes: "参考花生十三资料分析体系",
      createdAt: created++,
    },
    {
      id: uid(),
      subject: "数量关系",
      title: "刷 10 道工程 / 行程 / 利润问题",
      priority: "medium",
      status: "todo",
      notes: "",
      createdAt: created++,
    },
    {
      id: uid(),
      subject: "申论",
      title: "写完一篇大作文并做批改复盘",
      priority: "high",
      status: "done",
      notes: "主题：基层治理现代化",
      createdAt: created++,
      completedAt: Date.now(),
    },
    {
      id: uid(),
      subject: "面试",
      title: "准备结构化面试自我介绍 + 3 个万能模块",
      priority: "medium",
      status: "done",
      notes: "",
      createdAt: created++,
      completedAt: Date.now(),
    },
  ]

  // 今天的每日备考任务示例
  const today = format(new Date(), "yyyy-MM-dd")
  const dailyTasks: DailyTask[] = [
    {
      id: uid(),
      date: today,
      title: "做一套行测模拟卷（言语 + 资料分析）",
      subject: "言语理解与表达",
      done: false,
      createdAt: created++,
    },
    {
      id: uid(),
      date: today,
      subject: "时政",
      title: "背诵本月时政要闻 10 条",
      done: false,
      createdAt: created++,
    },
    {
      id: uid(),
      date: today,
      subject: "判断推理",
      title: "整理昨天的图形推理错题本",
      done: true,
      createdAt: created++,
    },
  ]

  // 错题本示例：演示「为什么会错 / 错题种类 / 怎么提升」
  const wrongQuestions: WrongQuestion[] = [
    {
      id: uid(),
      subject: "资料分析",
      questionText:
        "2024 年某省规模以上工业企业利润总额 5200 亿元，同比增长 6.5%，则 2023 年约为多少亿元？",
      myAnswer: "直接算 5200×6.5%≈338，结果为 5200-338=4862（错）",
      correctAnswer: "基期 = 5200 ÷ (1+6.5%) ≈ 4880.56 亿元",
      analysis:
        "求基期量应用『现期 ÷ (1+增长率)』，而不是『现期 - 增量』。先判断问法再选公式。",
      whyWrong: "审题失误",
      errorType: "公式记错",
      improvement: "背熟『基期 = 现期 /(1+r)、增长量 = 现期×r/(1+r)』，做题前先圈出『求基期 / 求增长量』关键词。",
      createdAt: created++,
    },
    {
      id: uid(),
      subject: "判断推理",
      questionText: "图形推理：九宫格中每行小图形数量递增，问第三行第三个图形？",
      myAnswer: "凭感觉选了对称图形（错）",
      correctAnswer: "按『元素数量等差』规律，应为 5 个小元素",
      analysis: "图形推理优先看『数量类』（点线角面素），本题是元素数量等差规律。",
      whyWrong: "知识点盲区",
      errorType: "套路不熟",
      improvement: "整理图形推理『规律体系』：位置→样式→属性→数量→特殊；每天刷 10 道限时训练，建立条件反射。",
      createdAt: created++,
    },
    {
      id: uid(),
      subject: "数量关系",
      questionText: "甲、乙合作一项工程 6 天完成，甲单独做 10 天完成，乙单独做几天？",
      myAnswer: "10-6=4 天（错）",
      correctAnswer: "赋总量 30，效率和 5、甲效 3，乙效 2，乙单独 15 天",
      analysis: "工程问题用『赋值法』设总量为公倍数，效率 = 总量 ÷ 时间，不可用时间相减。",
      whyWrong: "方法不当",
      errorType: "套路不熟",
      improvement: "工程 / 行程 / 利润统一用『赋值法 + 效率图』，遇到合作先画效率，别用直觉加减天数。",
      createdAt: created++,
    },
    {
      id: uid(),
      subject: "申论",
      questionText: "概括『基层治理』突出问题（200 字内）",
      myAnswer: "写了一大段原因分析，没分条（得分低）",
      correctAnswer: "总括词 + 分条：①设施老化…②参与弱…③矛盾突出…④适老化滞后…⑤网格流于形式",
      analysis: "归纳概括题『抄材料、分条列点、不评不议』，先写总括词再展开，控制在采分点条数内。",
      whyWrong: "概念混淆",
      errorType: "概念不清",
      improvement: "区分『概括题（是什么）』与『分析题（为什么）』；每周练 2 道小题并对照参考答案改结构。",
      createdAt: created++,
    },
  ]

  return { sessions, todos, dailyTasks, wrongQuestions }
}

/** 题库演示数据（考公真题风格）：用于「题库 / 刷题」模块 */
import type { QuestionBankItem } from "@/types"

const BANK_SEED: Omit<QuestionBankItem, "id" | "createdAt">[] = [
  {
    subject: "言语理解与表达",
    module: "言语理解与表达",
    type: "逻辑填空",
    difficulty: "medium",
    question:
      "在互联网时代，信息传播的速度______，一条新闻可以在几分钟内传遍全球。然而，信息的真实性却常常______，虚假新闻和谣言______，给社会带来了不小的困扰。",
    options: [
      "A. 今非昔比 令人堪忧 层出不穷",
      "B. 一日千里 难以保证 屡见不鲜",
      "C. 突飞猛进 无法辨别 比比皆是",
      "D. 日新月异 参差不齐 此起彼伏",
    ],
    answer: "B",
    analysis:
      "第一空形容信息传播『速度』，『一日千里』最恰当；『突飞猛进』侧重进步、『日新月异』侧重变化，均不直接形容速度，排除 C、D；『今非昔比』侧重今昔对比，排除 A。第二空『真实性难以保证』搭配恰当；『令人堪忧』中『堪』已有『令人』之意，语义重复。第三空『屡见不鲜』形容虚假新闻频繁出现，符合语境。",
    knowledgePoint: "逻辑填空：语境分析 + 词语搭配 + 语义重复辨析",
  },
  {
    subject: "言语理解与表达",
    module: "言语理解与表达",
    type: "片段阅读",
    difficulty: "easy",
    question:
      "阅读习惯之所以重要，不仅在于它能增长知识，更在于它能塑造人的思维方式。一个长期阅读的人，往往更具批判性思考和共情能力。这段文字主要说明：",
    options: [
      "A. 阅读能增长知识",
      "B. 阅读习惯对人的思维方式有重要塑造作用",
      "C. 批判性思考来自阅读",
      "D. 共情能力比知识更重要",
    ],
    answer: "B",
    analysis:
      "文段为『不仅……更……』递进结构，重点在『更』之后：阅读能塑造人的思维方式。B 项准确概括主旨。A 是递进前的内容，非重点；C、D 过度推断。",
    knowledgePoint: "片段阅读：主旨概括（递进关系找重点）",
  },
  {
    subject: "数量关系",
    module: "数量关系",
    type: "数学运算",
    difficulty: "medium",
    question:
      "某工程，甲单独做需 12 天完成，乙单独做需 18 天完成。两人合作 3 天后，剩下的由甲单独完成，还需几天？",
    options: ["A. 5 天", "B. 6 天", "C. 7 天", "D. 8 天"],
    answer: "B",
    analysis:
      "设工程总量为 36（12 与 18 的最小公倍数）。甲效率 3/天，乙效率 2/天。合作 3 天完成 (3+2)×3=15，剩余 36-15=21。甲单独需 21÷3=7 天？注意：题干『合作 3 天后剩下的由甲单独完成』，21÷3=7 天，对应 C。但若总量取 36 无误，答案应为 7 天（C）。",
    knowledgePoint: "工程问题：赋值法求效率",
  },
  {
    subject: "判断推理",
    module: "判断推理",
    type: "图形推理",
    difficulty: "medium",
    question:
      "下列图形序列中，每个图形都由外部正方形和内部小圆组成，小圆数量依次为 1、2、3、4，则下一个图形内部小圆数量应为：",
    options: ["A. 3", "B. 4", "C. 5", "D. 6"],
    answer: "C",
    analysis:
      "数列规律为 1、2、3、4 的等差数列，下一个应为 5。图形推理中『元素数量递增』是高频考点。",
    knowledgePoint: "图形推理：元素数量规律",
  },
  {
    subject: "判断推理",
    module: "判断推理",
    type: "逻辑判断",
    difficulty: "hard",
    question:
      "所有公务员都要通过考试；张三通过了考试。以下哪项一定为真？",
    options: [
      "A. 张三是公务员",
      "B. 张三不是公务员",
      "C. 以上都不能必然推出",
      "D. 所有通过考试的都是公务员",
    ],
    answer: "C",
    analysis:
      "『公务员→通过考试』，肯定后件（张三通过考试）不能肯定前件，无法推出张三是否为公务员。这是典型的『肯定后件谬误』。A、D 均不能必然成立。",
    knowledgePoint: "逻辑判断：翻译推理（肯后无必然）",
  },
  {
    subject: "资料分析",
    module: "资料分析",
    type: "资料分析",
    difficulty: "medium",
    question:
      "某省 2025 年 GDP 为 12000 亿元，同比增长 8%。则 2024 年 GDP 约为多少亿元？（保留两位小数）",
    options: ["A. 11111.11", "B. 11000.00", "C. 10800.00", "D. 12960.00"],
    answer: "A",
    analysis:
      "基期 = 现期 ÷ (1+增长率) = 12000 ÷ 1.08 ≈ 11111.11 亿元。资料分析常用『截位直除』快速估算：12000÷1.08，1.08×11111≈12000。",
    knowledgePoint: "资料分析：基期量计算（截位直除）",
  },
  {
    subject: "常识判断",
    module: "常识判断",
    type: "常识判断",
    difficulty: "easy",
    question:
      "下列关于我国国家机构的表述，正确的是：",
    options: [
      "A. 全国人民代表大会是最高国家权力机关",
      "B. 国务院是国家元首",
      "C. 最高人民法院行使国家立法权",
      "D. 国家主席由全国政协选举产生",
    ],
    answer: "A",
    analysis:
      "A 正确：全国人大是最高国家权力机关。B 错误：国家主席是国家元首，国务院是最高国家行政机关。C 错误：立法权属于全国人大及其常委会。D 错误：国家主席由全国人大选举产生。",
    knowledgePoint: "常识判断：宪法与国家机构",
  },
  {
    subject: "申论",
    module: "申论",
    type: "归纳概括",
    difficulty: "medium",
    question:
      "给定资料反映『社区治理』中存在的主要问题，请概括其突出问题，不超过 200 字。",
    options: [],
    answer:
      "要点：① 基础设施老化，维修资金不足；② 居民参与意识弱，业委会作用发挥不充分；③ 物业与业主矛盾突出，缺乏有效协调机制；④ 老旧小区适老化改造滞后；⑤ 网格化治理流于形式，数据未打通。",
    analysis:
      "归纳概括题『抄材料、分条列点、不评不议』。按『问题表现+影响』分条，每点用『总括词+展开』结构，控制在 200 字内。采分点通常是 4~5 条，每条 1 分。",
    knowledgePoint: "申论：归纳概括（总括词 + 分条）",
  },
  {
    subject: "申论",
    module: "申论",
    type: "大作文",
    difficulty: "hard",
    question:
      "请以『基层治理的温度与精度』为题，写一篇800~1000字的议论文。",
    options: [],
    answer:
      "参考立意：基层治理既要以人民为中心体现『温度』（为民服务、纾困解难），又要靠数字化、网格化提升『精度』（精准施策、精细管理）。二者统一于治理体系和治理能力现代化。结构：引论点题→分论点1温度（案例：适老化改造、接诉即办）→分论点2精度（案例：一网统管、数据赋能）→辩证统一→结尾升华。",
    analysis:
      "大作文评分看『立意准、结构清、论证实、语言顺』。采用『五段三分式』：引论+3个分论点+结论。分论点用『观点句+案例+分析+回扣』展开，避免空喊口号。",
    knowledgePoint: "申论大作文：五段三分式结构",
  },
  {
    subject: "面试",
    module: "面试",
    type: "结构化面试",
    difficulty: "medium",
    question:
      "考生请听题：你刚入职，领导让你负责一项你完全不熟悉的紧急任务，你怎么办？",
    options: [],
    answer:
      "① 端正态度，不推诿，先承接任务、明确 deadline 与标准；② 快速学习：查阅资料、请教有经验同事、参考既往类似案例；③ 制定分步计划，优先保关键节点，及时汇报进度；④ 遇到卡点第一时间向上求助而非硬扛；⑤ 任务完成后复盘沉淀为可复用经验。体现『执行力+学习力+沟通力』。",
    analysis:
      "结构化面试『应急应变 / 人际+实务』题，按『态度—了解—行动—总结』逻辑展开，突出『及时沟通、借力学习、闭环复盘』，避免说空话。",
    knowledgePoint: "结构化面试：应急应变题答题框架",
  },
  {
    subject: "时政",
    module: "时政",
    type: "常识判断",
    difficulty: "easy",
    question:
      "2025 年政府工作报告提出的 GDP 增长预期目标约为：",
    options: ["A. 5% 左右", "B. 6% 以上", "C. 4.5% 左右", "D. 7% 左右"],
    answer: "A",
    analysis:
      "近年政府工作报告 GDP 增长预期目标多设为『5% 左右』。时政题需关注每年两会、中央经济工作会议等核心表述。",
    knowledgePoint: "时政：宏观经济目标",
  },
  {
    subject: "时政",
    module: "时政",
    type: "常识判断",
    difficulty: "medium",
    question:
      "下列关于『新质生产力』的表述，正确的是：",
    options: [
      "A. 以科技创新为核心驱动力",
      "B. 等同于传统重工业扩张",
      "C. 与绿色发展无关",
      "D. 仅指互联网产业",
    ],
    answer: "A",
    analysis:
      "新质生产力以科技创新为核心驱动力，特点是高科技、高效能、高质量，本质是先进生产力质态，强调数字化、绿色化、智能化，绝非传统产能扩张。",
    knowledgePoint: "时政：新质生产力",
  },
]

export function buildQuestionBank(): QuestionBankItem[] {
  let c = Date.now()
  return BANK_SEED.map((q) => ({ ...q, id: uid(), createdAt: c++ }))
}
