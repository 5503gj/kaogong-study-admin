import { z } from 'zod'
import type {
  AIConfig,
  BackupData,
  StudySession,
  TodoItem,
  DailyTask,
  FocusSession,
  StudyGoal,
  QuestionBankItem,
  WrongQuestion,
} from '@/types'

export interface Dataset {
  sessions: StudySession[]
  todos: TodoItem[]
  dailyTasks: DailyTask[]
  focusSessions: FocusSession[]
  goal: StudyGoal
  aiConfig: AIConfig
  questionBank: QuestionBankItem[]
  wrongQuestions: WrongQuestion[]
}
export const DEFAULT_AI: AIConfig = {
  enabled: false,
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o-mini',
  shareProfile: false,
}
export const emptyDataset = (): Dataset => ({
  sessions: [],
  todos: [],
  dailyTasks: [],
  focusSessions: [],
  goal: { dailyMinutes: 60, weeklyDays: 5 },
  aiConfig: { ...DEFAULT_AI },
  questionBank: [],
  wrongQuestions: [],
})
const text = z.string().max(10000)
const id = z.string().min(1).max(120)
const stamp = z.number().finite().nonnegative()
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    '日期无效',
  )
const maybeDate = z.union([date, z.literal('')]).optional()
const goal = z
  .object({
    dailyMinutes: z.number().finite().min(0).max(1440),
    weeklyDays: z.number().int().min(0).max(7),
    examDate: maybeDate,
  })
  .strict()
const ai = z
  .object({
    enabled: z.boolean(),
    endpoint: z.string().url().max(2000),
    model: z.string().min(1).max(120),
    apiKey: z.string().max(2000).optional(),
    shareProfile: z.boolean().optional(),
  })
  .strict()
const session = z
  .object({
    id,
    date,
    subject: z.string().min(1).max(80),
    title: text,
    duration: z.number().finite().min(0).max(1440),
    status: z.enum(['completed', 'reviewing']),
    rating: z.number().int().min(1).max(5).optional(),
    notes: text.optional(),
    createdAt: stamp,
  })
  .strict()
const todo = z
  .object({
    id,
    subject: text,
    title: text,
    priority: z.enum(['low', 'medium', 'high']),
    status: z.enum(['todo', 'doing', 'done']),
    targetDate: maybeDate,
    notes: text.optional(),
    createdAt: stamp,
    completedAt: stamp.optional(),
  })
  .strict()
const daily = z
  .object({
    id,
    date,
    title: text,
    subject: text.optional(),
    done: z.boolean(),
    createdAt: stamp,
  })
  .strict()
const focus = z
  .object({
    id,
    startedAt: stamp,
    endedAt: stamp,
    plannedMinutes: z.number().finite().min(0).max(1440),
    subject: text,
    note: text.optional(),
    switchCount: z.number().int().nonnegative(),
    awaySeconds: z.number().finite().min(0).max(86400),
    createdAt: stamp,
  })
  .strict()
  .refine((v) => v.endedAt >= v.startedAt, '结束时间早于开始时间')
const question = z
  .object({
    id,
    subject: text,
    module: text,
    type: text,
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    question: text,
    options: z.array(text).max(20).optional(),
    answer: text,
    analysis: text,
    knowledgePoint: text.optional(),
    createdAt: stamp,
  })
  .strict()
const photo = z
  .string()
  .max(2_000_000)
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
const wrong = z
  .object({
    id,
    bankId: id.optional(),
    photo: photo.optional(),
    subject: text,
    questionText: text.optional(),
    myAnswer: text.optional(),
    correctAnswer: text.optional(),
    analysis: text.optional(),
    whyWrong: z.enum([
      '知识点盲区',
      '审题失误',
      '计算错误',
      '时间不够',
      '概念混淆',
      '方法不当',
      '其他',
    ]),
    errorType: text.optional(),
    improvement: text.optional(),
    mastered: z.boolean().optional(),
    createdAt: stamp,
  })
  .strict()
const collection = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .max(20000)
    .refine(
      (rows) =>
        new Set(rows.map((row) => (row as { id: string }).id)).size ===
        rows.length,
      '记录ID重复',
    )
const schema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    exportedAt: z.string().datetime({ offset: true }),
    sessions: collection(session),
    todos: collection(todo),
    dailyTasks: collection(daily),
    focusSessions: collection(focus),
    goal,
    aiConfig: ai.optional(),
    questionBank: collection(question),
    wrongQuestions: collection(wrong),
  })
  .strict()

export function safeAI(config: AIConfig): AIConfig {
  return {
    enabled: false,
    endpoint: config.endpoint,
    model: config.model,
    apiKey: '',
    shareProfile: config.shareProfile ?? false,
  }
}
export function parseBackup(input: unknown): Dataset {
  const result = schema.safeParse(input)
  if (!result.success)
    throw new Error(
      '备份结构、版本或字段不合法；原数据未修改：' +
        result.error.issues[0]?.message,
    )
  const { version: _version, exportedAt: _exportedAt, ...data } = result.data
  void _version
  void _exportedAt
  return {
    ...data,
    aiConfig: safeAI({ ...DEFAULT_AI, ...data.aiConfig }),
  } as Dataset
}
export function createBackup(data: Dataset): BackupData {
  const { apiKey: _secret, ...config } = safeAI(data.aiConfig)
  void _secret
  return {
    ...data,
    aiConfig: config,
    version: 2,
    exportedAt: new Date().toISOString(),
  }
}
