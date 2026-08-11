// 数据模型定义 —— 整个应用的核心结构
// 后期如果要迁移到小程序 / 后端 API，只要保持这些字段不变即可复用

/** 学习记录（一次实际的学习行为） */
export interface StudySession {
  id: string
  date: string // 学习日期，格式 YYYY-MM-DD
  subject: string // 科目 / 分类，例如：前端、算法、英语
  title: string // 学习内容，例如：看完 React Router 章节
  duration: number // 学习时长（分钟）
  status: SessionStatus // 学习状态
  rating?: number // 自评掌握度 1~5（可选）
  notes?: string // 备注（可选）
  createdAt: number // 创建时间戳，用于排序
}

/** 学习状态：已完成 / 复习中 */
export type SessionStatus = "completed" | "reviewing"

/** 待学清单（「我还需要学什么」） */
export interface TodoItem {
  id: string
  subject: string
  title: string
  priority: Priority // 优先级
  status: TodoStatus // 进度
  targetDate?: string // 目标完成日期 YYYY-MM-DD（可选）
  notes?: string
  createdAt: number
  completedAt?: number // 完成时间戳（可选）
}

export type TodoStatus = "todo" | "doing" | "done"
export type Priority = "low" | "medium" | "high"

/** 每日任务（按天设置、当天打卡） */
export interface DailyTask {
  id: string
  date: string // 归属日期 YYYY-MM-DD
  title: string // 任务内容
  subject?: string // 关联科目（可选）
  done: boolean // 是否完成
  createdAt: number
}

/** 专注时段（防切出计时记录） */
export interface FocusSession {
  id: string
  startedAt: number // 开始时间戳
  endedAt: number // 结束时间戳
  plannedMinutes: number // 计划专注分钟数
  subject: string // 专注科目 / 主题
  note?: string // 专注目标（可选）
  switchCount: number // 切出次数（切换标签页 / 最小化 / 失焦）
  awaySeconds: number // 累计离开时长（秒）
  createdAt: number
}

/** AI 助手配置（可接入兼容 OpenAI 的接口） */
export interface AIConfig {
  enabled: boolean // 是否启用真实大模型
  endpoint: string // 兼容 OpenAI Chat Completions 的地址
  apiKey: string // API Key
  model: string // 模型名
}

/** 学习目标设置 */
export interface StudyGoal {
  dailyMinutes: number // 每日目标学习分钟数
  weeklyDays: number // 每周目标学习天数
  examDate?: string // 模考 / 笔试目标日期 YYYY-MM-DD（用于倒计时提醒）
}

/** 题库题目（考公真题风格，含解析与考点） */
export interface QuestionBankItem {
  id: string
  subject: string // 大科目：行测/申论/面试/时政
  module: string // 具体模块，如 言语理解与表达
  type: string // 题型，如 逻辑填空 / 大作文
  difficulty?: "easy" | "medium" | "hard"
  question: string // 题干
  options?: string[] // 选择题选项（申论/面试可为空）
  answer: string // 参考答案 / 要点
  analysis: string // 解析
  knowledgePoint?: string // 考点
  createdAt: number
}

/** 错题错因大类 */
export type WrongReason =
  | "知识点盲区"
  | "审题失误"
  | "计算错误"
  | "时间不够"
  | "概念混淆"
  | "方法不当"
  | "其他"

/**
 * 错题本条目：拍照/录入一道错题，并记录为什么会错、错题种类、之后如何提升。
 * 既可由题库题目「加入错题本」生成，也可通过「拍照记录错题」新建。
 */
export interface WrongQuestion {
  id: string
  bankId?: string // 若来自题库题目，则记录其 id（用于题库的「只看错题本」过滤）
  photo?: string // 错题照片（dataURL，可拍照或上传）
  subject: string // 科目
  questionText?: string // 题目内容 / 题干
  myAnswer?: string // 我的作答
  correctAnswer?: string // 正确答案 / 标准要点
  analysis?: string // 解析 / 正确思路
  whyWrong: WrongReason // 错因大类：为什么会错
  errorType?: string // 错题种类（细分，如 概念不清 / 公式记错 / 套路不熟…）
  improvement?: string // 之后如何提升
  mastered?: boolean // 是否已掌握（回做做对后可标记）
  createdAt: number
}

/** 一次完整的数据备份 / 导入结构 */
export interface BackupData {
  version: number
  sessions: StudySession[]
  todos: TodoItem[]
  dailyTasks: DailyTask[]
  focusSessions: FocusSession[]
  goal: StudyGoal
  aiConfig?: AIConfig
  questionBank: QuestionBankItem[]
  wrongQuestions: WrongQuestion[]
  exportedAt: string
}
