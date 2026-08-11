// 时间 / 时长格式化工具
import { format, parseISO } from "date-fns"

/** 把分钟数格式化成「X 小时 Y 分」 */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h === 0) return `${mm} 分钟`
  if (mm === 0) return `${h} 小时`
  return `${h} 小时 ${mm} 分`
}

/** 把小时数格式化成「X.X 小时」 */
export function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)} 小时`
}

/** 格式化日期，支持字符串 / 数字 / Date */
export function formatDate(date: string | number | Date, pattern = "yyyy-MM-dd"): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : new Date(date)
    return format(d, pattern)
  } catch {
    return String(date)
  }
}

/** 今天的日期 YYYY-MM-DD */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd")
}
