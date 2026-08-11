// 看板统计计算：把原始记录聚合成各种指标
import {
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import type { StudyGoal, StudySession, TodoItem } from "@/types"

export interface SubjectStat {
  subject: string
  minutes: number
  count: number
}

export interface TrendPoint {
  date: string
  minutes: number
}

export interface DashboardStats {
  totalMinutes: number
  totalHours: number
  sessionCount: number
  studyDays: number
  avgMinutesPerActiveDay: number
  bySubject: SubjectStat[]
  trend: TrendPoint[] // 最近 30 天
  last7Minutes: number
  last30Minutes: number
  todoTotal: number
  todoDone: number
  todoDoing: number
  todoTodo: number
  goalDailyMinutes: number
  todayMinutes: number
  goalProgress: number // 0~1，今天目标完成度
  heatmap: { date: string; minutes: number }[] // 最近 ~119 天（含今天）
}

export function computeStats(
  sessions: StudySession[],
  todos: TodoItem[],
  goal: StudyGoal,
): DashboardStats {
  const totalMinutes = sessions.reduce((s, x) => s + (x.duration || 0), 0)
  const sessionCount = sessions.length

  const daySet = new Set(sessions.map((s) => s.date))
  const studyDays = daySet.size
  const avgMinutesPerActiveDay = studyDays ? totalMinutes / studyDays : 0

  // 按学科聚合
  const subjMap = new Map<string, SubjectStat>()
  for (const s of sessions) {
    const e = subjMap.get(s.subject) ?? {
      subject: s.subject,
      minutes: 0,
      count: 0,
    }
    e.minutes += s.duration || 0
    e.count += 1
    subjMap.set(s.subject, e)
  }
  const bySubject = [...subjMap.values()].sort((a, b) => b.minutes - a.minutes)

  const today = new Date()

  // 最近 30 天趋势
  const trendDays = eachDayOfInterval({ start: subDays(today, 29), end: today })
  const trend = trendDays.map((d) => {
    const key = format(d, "yyyy-MM-dd")
    const minutes = sessions
      .filter((s) => s.date === key)
      .reduce((a, s) => a + s.duration, 0)
    return { date: key, minutes }
  })
  const last7Minutes = trend.slice(-7).reduce((a, p) => a + p.minutes, 0)
  const last30Minutes = trend.reduce((a, p) => a + p.minutes, 0)

  // 热力图：最近 119 天（17 周）
  const heatDays = eachDayOfInterval({ start: subDays(today, 118), end: today })
  const heatmap = heatDays.map((d) => {
    const key = format(d, "yyyy-MM-dd")
    const minutes = sessions
      .filter((s) => s.date === key)
      .reduce((a, s) => a + s.duration, 0)
    return { date: key, minutes }
  })

  const todayKey = format(today, "yyyy-MM-dd")
  const todayMinutes = sessions
    .filter((s) => s.date === todayKey)
    .reduce((a, s) => a + s.duration, 0)

  const todoTotal = todos.length
  const todoDone = todos.filter((t) => t.status === "done").length
  const todoDoing = todos.filter((t) => t.status === "doing").length
  const todoTodo = todos.filter((t) => t.status === "todo").length

  const goalDailyMinutes = goal?.dailyMinutes || 0
  const goalProgress =
    goalDailyMinutes > 0 ? Math.min(1, todayMinutes / goalDailyMinutes) : 0

  return {
    totalMinutes,
    totalHours: totalMinutes / 60,
    sessionCount,
    studyDays,
    avgMinutesPerActiveDay: avgMinutesPerActiveDay,
    bySubject,
    trend,
    last7Minutes,
    last30Minutes,
    todoTotal,
    todoDone,
    todoDoing,
    todoTodo,
    goalDailyMinutes,
    todayMinutes,
    goalProgress,
    heatmap,
  }
}

/** 学习时长视图周期 */
export type Period = "day" | "week" | "month" | "year"

/** 周期聚合点 */
export interface PeriodPoint {
  key: string // 周期标识（日期 / 周起点 / 年月 / 年）
  label: string // 横轴标签
  minutes: number // 该周期总学习分钟
  count: number // 该周期记录条数
  content: string[] // 当日学习内容标题（仅 day 周期有值）
}

/** 按 日 / 周 / 月 / 年 聚合学习时长，用于折线图 */
export function buildPeriodSeries(
  sessions: StudySession[],
  period: Period,
): PeriodPoint[] {
  const now = new Date()

  if (period === "day") {
    const days = eachDayOfInterval({ start: subDays(now, 29), end: now })
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd")
      const ss = sessions.filter((s) => s.date === key)
      return {
        key,
        label: format(d, "MM/dd"),
        minutes: ss.reduce((a, s) => a + s.duration, 0),
        count: ss.length,
        content: ss.map((s) => s.title),
      }
    })
  }

  if (period === "week") {
    const out: PeriodPoint[] = []
    for (let i = 11; i >= 0; i--) {
      const start = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
      const end = endOfWeek(start, { weekStartsOn: 1 })
      const ss = sessions.filter((s) => {
        const d = parseISO(s.date)
        return d >= start && d <= end
      })
      out.push({
        key: format(start, "yyyy-MM-dd"),
        label: format(start, "MM/dd"),
        minutes: ss.reduce((a, s) => a + s.duration, 0),
        count: ss.length,
        content: [],
      })
    }
    return out
  }

  if (period === "month") {
    const out: PeriodPoint[] = []
    for (let i = 11; i >= 0; i--) {
      const start = startOfMonth(subMonths(now, i))
      const end = endOfMonth(start)
      const ss = sessions.filter((s) => {
        const d = parseISO(s.date)
        return d >= start && d <= end
      })
      out.push({
        key: format(start, "yyyy-MM"),
        label: format(start, "yyyy/MM"),
        minutes: ss.reduce((a, s) => a + s.duration, 0),
        count: ss.length,
        content: [],
      })
    }
    return out
  }

  // year
  const out: PeriodPoint[] = []
  for (let i = 4; i >= 0; i--) {
    const start = startOfYear(subYears(now, i))
    const end = endOfYear(start)
    const ss = sessions.filter((s) => {
      const d = parseISO(s.date)
      return d >= start && d <= end
    })
    out.push({
      key: format(start, "yyyy"),
      label: format(start, "yyyy"),
      minutes: ss.reduce((a, s) => a + s.duration, 0),
      count: ss.length,
      content: [],
    })
  }
  return out
}
