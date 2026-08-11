// 数据 Context：备考记录 / 考点清单 / 每日任务 / 专注记录 / 目标 / AI 配置 / 题库 / 错题本
// 全部 localStorage 持久化，无需后端即可运行
import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react"
import { uid, usePersistentState } from "@/lib/storage"
import type {
  AIConfig,
  DailyTask,
  FocusSession,
  QuestionBankItem,
  StudyGoal,
  StudySession,
  TodoItem,
  WrongQuestion,
} from "@/types"
import { buildQuestionBank, buildSeed } from "@/lib/seed"

const SEED_FLAG = "study-admin:seeded"

const DEFAULT_AI: AIConfig = {
  enabled: false,
  endpoint: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-4o-mini",
}

interface DataValue {
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

  addSession: (s: Omit<StudySession, "id" | "createdAt">) => void
  updateSession: (id: string, patch: Partial<StudySession>) => void
  removeSession: (id: string) => void

  addTodo: (t: Omit<TodoItem, "id" | "createdAt">) => void
  updateTodo: (id: string, patch: Partial<TodoItem>) => void
  removeTodo: (id: string) => void

  addDailyTask: (t: Omit<DailyTask, "id" | "createdAt">) => void
  updateDailyTask: (id: string, patch: Partial<DailyTask>) => void
  removeDailyTask: (id: string) => void

  addFocusSession: (f: Omit<FocusSession, "id" | "createdAt">) => void

  addQuestion: (q: Omit<QuestionBankItem, "id" | "createdAt">) => void
  updateQuestion: (id: string, patch: Partial<QuestionBankItem>) => void
  removeQuestion: (id: string) => void

  addWrongQuestion: (w: Omit<WrongQuestion, "id" | "createdAt">) => void
  updateWrongQuestion: (id: string, patch: Partial<WrongQuestion>) => void
  removeWrongQuestion: (id: string) => void
  toggleWrong: (bankId: string) => void
  clearWrong: () => void

  importData: (
    data: Partial<{
      sessions: StudySession[]
      todos: TodoItem[]
      dailyTasks: DailyTask[]
      focusSessions: FocusSession[]
      goal: StudyGoal
      aiConfig: AIConfig
      questionBank: QuestionBankItem[]
      wrongQuestions: WrongQuestion[]
    }>,
  ) => void
  resetAll: () => void
}

const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = usePersistentState<StudySession[]>(
    "study-admin:sessions",
    [],
  )
  const [todos, setTodos] = usePersistentState<TodoItem[]>("study-admin:todos", [])
  const [dailyTasks, setDailyTasks] = usePersistentState<DailyTask[]>(
    "study-admin:dailyTasks",
    [],
  )
  const [focusSessions, setFocusSessions] = usePersistentState<FocusSession[]>(
    "study-admin:focusSessions",
    [],
  )
  const [goal, setGoal] = usePersistentState<StudyGoal>("study-admin:goal", {
    dailyMinutes: 60,
    weeklyDays: 5,
  })
  const [aiConfig, setAIConfig] = usePersistentState<AIConfig>(
    "study-admin:aiConfig",
    DEFAULT_AI,
  )
  const [questionBank, setQuestionBank] = usePersistentState<QuestionBankItem[]>(
    "study-admin:questionBank",
    [],
  )
  const [wrongQuestions, setWrongQuestions] = usePersistentState<WrongQuestion[]>(
    "study-admin:wrongQuestions",
    [],
  )

  // 首次启动填充演示数据（仅一次）
  useEffect(() => {
    if (!localStorage.getItem(SEED_FLAG)) {
      const seed = buildSeed()
      setSessions(seed.sessions)
      setTodos(seed.todos)
      setDailyTasks(seed.dailyTasks)
      setQuestionBank(buildQuestionBank())
      setWrongQuestions(seed.wrongQuestions)
      localStorage.setItem(SEED_FLAG, "1")
    }
  }, [setSessions, setTodos, setDailyTasks, setQuestionBank, setWrongQuestions])

  const addSession = (s: Omit<StudySession, "id" | "createdAt">) =>
    setSessions((prev) => [{ ...s, id: uid(), createdAt: Date.now() }, ...prev])

  const updateSession = (id: string, patch: Partial<StudySession>) =>
    setSessions((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const removeSession = (id: string) =>
    setSessions((prev) => prev.filter((x) => x.id !== id))

  const addTodo = (t: Omit<TodoItem, "id" | "createdAt">) =>
    setTodos((prev) => [{ ...t, id: uid(), createdAt: Date.now() }, ...prev])

  const updateTodo = (id: string, patch: Partial<TodoItem>) =>
    setTodos((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const removeTodo = (id: string) =>
    setTodos((prev) => prev.filter((x) => x.id !== id))

  const addDailyTask = (t: Omit<DailyTask, "id" | "createdAt">) =>
    setDailyTasks((prev) => [{ ...t, id: uid(), createdAt: Date.now() }, ...prev])

  const updateDailyTask = (id: string, patch: Partial<DailyTask>) =>
    setDailyTasks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    )

  const removeDailyTask = (id: string) =>
    setDailyTasks((prev) => prev.filter((x) => x.id !== id))

  const addFocusSession = (f: Omit<FocusSession, "id" | "createdAt">) =>
    setFocusSessions((prev) => [
      { ...f, id: uid(), createdAt: Date.now() },
      ...prev,
    ])

  const addQuestion = (q: Omit<QuestionBankItem, "id" | "createdAt">) =>
    setQuestionBank((prev) => [{ ...q, id: uid(), createdAt: Date.now() }, ...prev])

  const updateQuestion = (id: string, patch: Partial<QuestionBankItem>) =>
    setQuestionBank((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    )

  const removeQuestion = (id: string) =>
    setQuestionBank((prev) => prev.filter((x) => x.id !== id))

  const addWrongQuestion = (w: Omit<WrongQuestion, "id" | "createdAt">) =>
    setWrongQuestions((prev) => [
      { ...w, id: uid(), createdAt: Date.now() },
      ...prev,
    ])

  const updateWrongQuestion = (id: string, patch: Partial<WrongQuestion>) =>
    setWrongQuestions((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    )

  const removeWrongQuestion = (id: string) =>
    setWrongQuestions((prev) => prev.filter((x) => x.id !== id))

  // 题库题目「加入 / 移出错题本」：基于 bankId 生成或移除一条错题
  const toggleWrong = (bankId: string) =>
    setWrongQuestions((prev) => {
      const exist = prev.find((w) => w.bankId === bankId)
      if (exist) return prev.filter((w) => w.bankId !== bankId)
      const q = questionBank.find((x) => x.id === bankId)
      if (!q) return prev
      const w: WrongQuestion = {
        id: uid(),
        bankId: q.id,
        subject: q.subject,
        questionText: q.question,
        correctAnswer: q.answer,
        analysis: q.analysis,
        whyWrong: "知识点盲区",
        errorType: q.knowledgePoint,
        createdAt: Date.now(),
      }
      return [w, ...prev]
    })

  const clearWrong = () => setWrongQuestions([])

  const importData = (
    data: Partial<{
      sessions: StudySession[]
      todos: TodoItem[]
      dailyTasks: DailyTask[]
      focusSessions: FocusSession[]
      goal: StudyGoal
      aiConfig: AIConfig
      questionBank: QuestionBankItem[]
      wrongQuestions: WrongQuestion[]
    }>,
  ) => {
    if (data.sessions) setSessions(data.sessions)
    if (data.todos) setTodos(data.todos)
    if (data.dailyTasks) setDailyTasks(data.dailyTasks)
    if (data.focusSessions) setFocusSessions(data.focusSessions)
    if (data.goal) setGoal(data.goal)
    if (data.aiConfig) setAIConfig(data.aiConfig)
    if (data.questionBank) setQuestionBank(data.questionBank)
    if (data.wrongQuestions) setWrongQuestions(data.wrongQuestions)
  }

  const resetAll = () => {
    setSessions([])
    setTodos([])
    setDailyTasks([])
    setFocusSessions([])
    setGoal({ dailyMinutes: 60, weeklyDays: 5 })
    setAIConfig(DEFAULT_AI)
    setQuestionBank([])
    setWrongQuestions([])
    localStorage.removeItem(SEED_FLAG)
  }

  return (
    <DataContext.Provider
      value={{
        sessions,
        todos,
        dailyTasks,
        focusSessions,
        goal,
        aiConfig,
        questionBank,
        wrongQuestions,
        setGoal,
        setAIConfig,
        addSession,
        updateSession,
        removeSession,
        addTodo,
        updateTodo,
        removeTodo,
        addDailyTask,
        updateDailyTask,
        removeDailyTask,
        addFocusSession,
        addQuestion,
        updateQuestion,
        removeQuestion,
        addWrongQuestion,
        updateWrongQuestion,
        removeWrongQuestion,
        toggleWrong,
        clearWrong,
        importData,
        resetAll,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData 必须在 DataProvider 内使用")
  return ctx
}
