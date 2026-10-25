// 警醒横幅：进入首页时检查目标未达成 / 逾期待学，给出醒目提醒
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useData } from "@/context/data"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { formatDuration } from "@/lib/format"

export function WarningBanner() {
  const { sessions, todos, goal } = useData()
  const [dismissed, setDismissed] = useState(false)

  const alerts = useMemo(() => {
    const list: string[] = []
    const todayKey = format(new Date(), "yyyy-MM-dd")
    const hour = new Date().getHours()

    const todayMinutes = sessions
      .filter((s) => s.date === todayKey)
      .reduce((a, s) => a + s.duration, 0)
    if (goal.dailyMinutes > 0 && todayMinutes < goal.dailyMinutes && hour >= 19) {
      list.push(
        `今日目标还差 ${formatDuration(goal.dailyMinutes - todayMinutes)}，别让今天白过。`,
      )
    }
    const overdue = todos.filter(
      (t) => t.status !== "done" && t.targetDate && t.targetDate < todayKey,
    )
    if (overdue.length > 0) {
      list.push(`${overdue.length} 个考点目标已逾期，建议优先处理。`)
    }
    if (goal.examDate) {
      const days = differenceInCalendarDays(parseISO(goal.examDate), new Date())
      if (days >= 0 && days <= 60) {
        list.push(
          days === 0
            ? "今天就是目标考试日，稳住心态，正常发挥！"
            : `距离目标考试日还有 ${days} 天，进入「套卷 + 模考」节奏吧。`,
        )
      }
    }
    return list
  }, [sessions, todos, goal])

  // 首次进入且存在提醒时，弹出系统通知（已授权的话）
  useEffect(() => {
    if (alerts.length > 0 && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("备考提醒", { body: alerts[0] })
      }
    }
  }, [alerts])

  if (dismissed || alerts.length === 0) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 font-medium text-destructive">
          <BellRing className="size-4" /> 警醒一下
        </div>
        <ul className="space-y-0.5 text-sm">
          {alerts.map((a, i) => (
            <li key={i}>· {a}</li>
          ))}
        </ul>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setDismissed(true)
          toast("已忽略本次提醒")
        }}
      >
        知道了
      </Button>
    </div>
  )
}
