// 每日任务页：按天设置 / 打卡学习任务
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Check, Plus, Trash2, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/data"
import { todayISO } from "@/lib/format"

export function Daily() {
  const { dailyTasks, addDailyTask, updateDailyTask, removeDailyTask } = useData()
  const [date, setDate] = useState(todayISO())
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")

  const list = useMemo(
    () =>
      dailyTasks
        .filter((t) => t.date === date)
        .sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt),
    [dailyTasks, date],
  )

  const doneCount = list.filter((t) => t.done).length
  const total = list.length
  const progress = total ? (doneCount / total) * 100 : 0

  const add = () => {
    const t = title.trim()
    if (!t) return
    addDailyTask({ date, title: t, subject: subject.trim() || undefined, done: false })
    setTitle("")
    setSubject("")
    toast.success("已添加今日任务")
  }

  const toggle = (id: string, done: boolean) => updateDailyTask(id, { done: !done })
  const del = (id: string) => {
    removeDailyTask(id)
    toast.success("已删除")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">每日备考</h1>
          <p className="text-sm text-muted-foreground">
            把大目标拆成每天可执行的小任务，完成即打卡。
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="size-4" /> {date} 的任务
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            />
            <span className="text-sm text-muted-foreground">
              已完成 {doneCount} / {total}
            </span>
          </div>
          <Progress value={progress} />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="添加一项任务，例如：做一套行测模拟卷"
            />
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="科目（可选）"
              className="sm:w-40"
            />
            <Button onClick={add}>
              <Plus className="size-4" /> 添加
            </Button>
          </div>

          <div className="space-y-2">
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">这一天还没有任务，上面加一个吧。</p>
            ) : (
              list.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border p-2"
                >
                  <button
                    onClick={() => toggle(t.id, t.done)}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                      t.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40"
                    }`}
                    aria-label="切换完成"
                  >
                    {t.done && <Check className="size-3.5" />}
                  </button>
                  <span
                    className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}
                  >
                    {t.title}
                  </span>
                  {t.subject && <Badge variant="outline">{t.subject}</Badge>}
                  <button
                    onClick={() => del(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="删除"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
