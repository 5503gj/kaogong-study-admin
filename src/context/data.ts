import { createContext, useContext } from 'react'
import type {
  AIConfig,
  DailyTask,
  FocusSession,
  QuestionBankItem,
  StudyGoal,
  StudySession,
  TodoItem,
  WrongQuestion,
} from '@/types'
export interface DataValue {
  sessions: StudySession[]
  todos: TodoItem[]
  dailyTasks: DailyTask[]
  focusSessions: FocusSession[]
  goal: StudyGoal
  aiConfig: AIConfig
  questionBank: QuestionBankItem[]
  wrongQuestions: WrongQuestion[]

  setGoal: (g: StudyGoal) => void
  setAIConfig: (c: AIConfig) => void

  addSession: (s: Omit<StudySession, 'id' | 'createdAt'>) => void
  updateSession: (id: string, patch: Partial<StudySession>) => void
  removeSession: (id: string) => void

  addTodo: (t: Omit<TodoItem, 'id' | 'createdAt'>) => void
  updateTodo: (id: string, patch: Partial<TodoItem>) => void
  removeTodo: (id: string) => void

  addDailyTask: (t: Omit<DailyTask, 'id' | 'createdAt'>) => void
  updateDailyTask: (id: string, patch: Partial<DailyTask>) => void
  removeDailyTask: (id: string) => void

  addFocusSession: (f: Omit<FocusSession, 'id' | 'createdAt'>) => void

  addQuestion: (q: Omit<QuestionBankItem, 'id' | 'createdAt'>) => void
  updateQuestion: (id: string, patch: Partial<QuestionBankItem>) => void
  removeQuestion: (id: string) => void

  addWrongQuestion: (w: Omit<WrongQuestion, 'id' | 'createdAt'>) => void
  updateWrongQuestion: (id: string, patch: Partial<WrongQuestion>) => void
  removeWrongQuestion: (id: string) => void
  toggleWrong: (bankId: string) => void
  clearWrong: () => void

  importData: (data: unknown) => Promise<void>
  resetAll: () => Promise<void>
  restoreImport: () => Promise<{ aiConfig: AIConfig; goal: StudyGoal }>
  hasUnsaved: boolean
}

export const DataContext = createContext<DataValue | null>(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData requires DataProvider')
  return ctx
}
