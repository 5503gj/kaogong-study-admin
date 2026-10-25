// 数据 Context：备考记录 / 考点清单 / 每日任务 / 专注记录 / 目标 / AI 配置 / 题库 / 错题本
// 按本地账号分区保存到 IndexedDB；模型凭证仅驻留当前页面内存
import { type ReactNode } from 'react'
import { uid } from '@/lib/storage'
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
import { useDataset } from '@/lib/profile-store'
import { emptyDataset, parseBackup } from '@/lib/backup'
import { useAuth } from '@/context/auth'

import { DataContext } from './data'
import { mergePlanTasks, type PlanTask } from '@/lib/study-pilot'

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const {
    data,
    ready,
    saveState,
    setField,
    replace,
    restore,
    transact,
    hasUnsaved,
  } = useDataset(user)
  const {
    sessions,
    todos,
    dailyTasks,
    focusSessions,
    goal,
    aiConfig,
    questionBank,
    wrongQuestions,
  } = data
  type Updater<T> = T | ((previous: T) => T)
  const setSessions = (v: Updater<StudySession[]>) => setField('sessions', v)
  const setTodos = (v: Updater<TodoItem[]>) => setField('todos', v)
  const setDailyTasks = (v: Updater<DailyTask[]>) => setField('dailyTasks', v)
  const setFocusSessions = (v: Updater<FocusSession[]>) =>
    setField('focusSessions', v)
  const setGoal = (v: StudyGoal) => setField('goal', v)
  const setAIConfig = (v: AIConfig) => setField('aiConfig', v)
  const setQuestionBank = (v: Updater<QuestionBankItem[]>) =>
    setField('questionBank', v)
  const setWrongQuestions = (v: Updater<WrongQuestion[]>) =>
    setField('wrongQuestions', v)

  const addSession = (s: Omit<StudySession, 'id' | 'createdAt'>) =>
    setSessions((prev) => [{ ...s, id: uid(), createdAt: Date.now() }, ...prev])

  const updateSession = (id: string, patch: Partial<StudySession>) =>
    setSessions((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    )

  const removeSession = (id: string) =>
    setSessions((prev) => prev.filter((x) => x.id !== id))

  const addTodo = (t: Omit<TodoItem, 'id' | 'createdAt'>) =>
    setTodos((prev) => [{ ...t, id: uid(), createdAt: Date.now() }, ...prev])

  const updateTodo = (id: string, patch: Partial<TodoItem>) =>
    setTodos((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const removeTodo = (id: string) =>
    setTodos((prev) => prev.filter((x) => x.id !== id))

  const addDailyTask = (t: Omit<DailyTask, 'id' | 'createdAt'>) =>
    setDailyTasks((prev) => [
      { ...t, id: uid(), createdAt: Date.now() },
      ...prev,
    ])

  const updateDailyTask = (id: string, patch: Partial<DailyTask>) =>
    setDailyTasks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    )

  const removeDailyTask = (id: string) =>
    setDailyTasks((prev) => prev.filter((x) => x.id !== id))

  const addFocusSession = (f: Omit<FocusSession, 'id' | 'createdAt'>) =>
    setFocusSessions((prev) => [
      { ...f, id: uid(), createdAt: Date.now() },
      ...prev,
    ])

  const addQuestion = (q: Omit<QuestionBankItem, 'id' | 'createdAt'>) =>
    setQuestionBank((prev) => [
      { ...q, id: uid(), createdAt: Date.now() },
      ...prev,
    ])

  const updateQuestion = (id: string, patch: Partial<QuestionBankItem>) =>
    setQuestionBank((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    )

  const removeQuestion = (id: string) =>
    setQuestionBank((prev) => prev.filter((x) => x.id !== id))

  const addWrongQuestion = (w: Omit<WrongQuestion, 'id' | 'createdAt'>) =>
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
        whyWrong: '知识点盲区',
        errorType: q.knowledgePoint,
        createdAt: Date.now(),
      }
      return [w, ...prev]
    })

  const clearWrong = () => setWrongQuestions([])
  const commitDailyTasks = async (tasks: PlanTask[]) => {
    let added = 0
    await transact((previous) => {
      const merged = mergePlanTasks(previous.dailyTasks, tasks)
      added = merged.added
      return { ...previous, dailyTasks: merged.tasks }
    })
    return added
  }

  const importData = (input: unknown) => replace(parseBackup(input))
  const resetAll = () => replace(emptyDataset())
  if (!ready)
    return (
      <div role="status" className="p-8">
        {saveState}
        <button onClick={() => location.reload()}>重试</button>
      </div>
    )

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
        commitDailyTasks,
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
        restoreImport: restore,
        hasUnsaved,
      }}
    >
      {user && (
        <p role="status" aria-live="polite" className="save-indicator">
          本地空间：{user} · {saveState}（浏览器本地分区，不是服务器身份认证）
        </p>
      )}
      {children}
    </DataContext.Provider>
  )
}
