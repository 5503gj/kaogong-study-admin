// 常量：状态 / 优先级的中文标签、颜色等
import type { Priority, SessionStatus, TodoStatus, WrongReason } from "@/types"

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  completed: "已完成",
  reviewing: "复习中",
}

export const TODO_STATUS_LABEL: Record<TodoStatus, string> = {
  todo: "待学",
  doing: "进行中",
  done: "已完成",
}

/** 看板列顺序 */
export const TODO_STATUS_ORDER: TodoStatus[] = ["todo", "doing", "done"]

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
}

export const PRIORITY_ORDER: Priority[] = ["high", "medium", "low"]

/** 优先级对应的 Badge 颜色（shadcn badge 的 variant） */
export const PRIORITY_BADGE: Record<Priority, "default" | "secondary" | "destructive"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
}

/** 考公科目体系：行测 5 大模块 + 申论 + 面试 + 时政 */
export const SUBJECTS = [
  "言语理解与表达",
  "数量关系",
  "判断推理",
  "资料分析",
  "常识判断",
  "申论",
  "面试",
  "时政",
] as const

/** 行测下属模块（用于题库筛选与看板拆分） */
export const XINGCE_MODULES = [
  { key: "言语理解与表达", label: "言语理解" },
  { key: "数量关系", label: "数量关系" },
  { key: "判断推理", label: "判断推理" },
  { key: "资料分析", label: "资料分析" },
  { key: "常识判断", label: "常识判断" },
]

/** 练习/刷题常见题型 */
export const QUESTION_TYPES = [
  "逻辑填空",
  "片段阅读",
  "语句表达",
  "数字推理",
  "数学运算",
  "图形推理",
  "定义判断",
  "类比推理",
  "逻辑判断",
  "资料分析",
  "常识判断",
  "归纳概括",
  "综合分析",
  "提出对策",
  "公文写作",
  "大作文",
  "结构化面试",
] as const

// 学科配色：根据名称哈希取色，保证同一学科颜色一致
const PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
]

export function subjectColor(subject: string): string {
  let hash = 0
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

/** 错题错因大类（为什么会错） */
export const WRONG_REASONS: { value: WrongReason; label: string; desc: string }[] = [
  { value: "知识点盲区", label: "知识点盲区", desc: "根本没掌握该考点" },
  { value: "审题失误", label: "审题失误", desc: "看错 / 漏看条件、问法" },
  { value: "计算错误", label: "计算错误", desc: "会做但算错、粗心" },
  { value: "时间不够", label: "时间不够", desc: "没时间做 / 仓促选错" },
  { value: "概念混淆", label: "概念混淆", desc: "相似概念弄混" },
  { value: "方法不当", label: "方法不当", desc: "用了低效 / 错误方法" },
  { value: "其他", label: "其他", desc: "其他非上述原因" },
]

/** 错题种类细分（用来给错题分类、找共性） */
export const ERROR_TYPES = [
  "概念不清",
  "公式记错",
  "套路不熟",
  "粗心大意",
  "陷阱忽略",
  "速度太慢",
  "其他",
] as const

/** 错因对应的颜色（用于图表与徽标） */
export const WRONG_REASON_COLOR: Record<WrongReason, string> = {
  知识点盲区: "#ef4444",
  审题失误: "#f59e0b",
  计算错误: "#0ea5e9",
  时间不够: "#8b5cf6",
  概念混淆: "#ec4899",
  方法不当: "#14b8a6",
  其他: "#64748b",
}
