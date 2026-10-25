// 数据看板：核心指标 + 学习时长视图(日/周/月/年) + 学科占比 + 热力图 + 智能建议
import { useMemo, useState } from "react"
import {
  Clock,
  CalendarDays,
  Flame,
  ListTodo,
  BookOpen,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StatCard } from "@/components/stat-card"
import { StudyHeatmap } from "@/components/dashboard/study-heatmap"
import { SubjectPie, StudyLineChart } from "@/components/dashboard/dashboard-charts"
import { WarningBanner } from "@/components/alerts/warning-banner"
import { SmartSuggestions } from "@/components/ai/smart-suggestions"
import { buildPeriodSeries, computeStats, type Period } from "@/lib/stats"
import { formatDate, formatDuration, formatHours } from "@/lib/format"
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  TODO_STATUS_LABEL,
} from "@/lib/constants"
import { useData } from "@/context/data"

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "日" },
  { key: "week", label: "周" },
  { key: "month", label: "月" },
  { key: "year", label: "年" },
]

export function Dashboard() {
  const { sessions, todos, goal } = useData()
  const [period, setPeriod] = useState<Period>("day")

  const stats = useMemo(
    () => computeStats(sessions, todos, goal),
    [sessions, todos, goal],
  )

  const points = useMemo(
    () => buildPeriodSeries(sessions, period),
    [sessions, period],
  )

  const totalInView = useMemo(
    () => points.reduce((a, p) => a + p.minutes, 0),
    [points],
  )

  const recent = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5),
    [sessions],
  )

  const upcoming = useMemo(
    () =>
      todos
        .filter((t) => t.status !== "done")
        .sort(
          (a, b) =>
            PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
        )
        .slice(0, 6),
    [todos],
  )

  return (
    <div className="space-y-4">
      {/* Hero 横幅 */}
      <div className="brand-gradient relative overflow-hidden rounded-xl p-5 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">备考看板</h1>
            <p className="mt-1 text-sm text-white/85">
              一目了然看见你的备考投入与进度。
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg bg-white/15 px-3 py-2 text-center">
              <div className="text-lg font-bold">{formatHours(stats.totalMinutes)}</div>
              <div className="text-[11px] text-white/80">累计学习</div>
            </div>
            <div className="rounded-lg bg-white/15 px-3 py-2 text-center">
              <div className="text-lg font-bold">{stats.studyDays}</div>
              <div className="text-[11px] text-white/80">学习天数</div>
            </div>
          </div>
        </div>
      </div>

      <WarningBanner />

      {/* 指标卡 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="累计学习"
          value={formatHours(stats.totalMinutes)}
          hint={`共 ${stats.sessionCount} 次记录`}
          icon={Clock}
          color="#6366f1"
        />
        <StatCard
          title="学习天数"
          value={`${stats.studyDays} 天`}
          hint={`日均 ${formatDuration(stats.avgMinutesPerActiveDay)}`}
          icon={CalendarDays}
          color="#0ea5e9"
        />
        <StatCard
          title="近 7 天"
          value={formatDuration(stats.last7Minutes)}
          hint={`近 30 天 ${formatDuration(stats.last30Minutes)}`}
          icon={Flame}
          color="#f59e0b"
        />
        <StatCard
          title="考点完成"
          value={`${stats.todoDone} / ${stats.todoTotal}`}
          hint={`进行中 ${stats.todoDoing} 项`}
          icon={ListTodo}
          color="#10b981"
        />
      </div>

      {/* 今日目标进度 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="size-4" /> 今日目标
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              今日已学 {formatDuration(stats.todayMinutes)} / 目标{" "}
              {formatDuration(stats.goalDailyMinutes)}
            </span>
            <span className="font-medium">
              {Math.round(stats.goalProgress * 100)}%
            </span>
          </div>
          <Progress value={stats.goalProgress * 100} />
        </CardContent>
      </Card>

      {/* 学习时长视图（日/周/月/年 折线图） */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">备考时长视图（折线图）</CardTitle>
            <div className="flex rounded-md border p-0.5 text-xs">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded px-2.5 py-1 transition-colors ${
                    period === p.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            当前视图合计 {formatDuration(totalInView)}
            {period === "day" && " · 悬停折线可查看当天学习内容"}
          </p>
        </CardHeader>
        <CardContent>
          <StudyLineChart points={points} />
        </CardContent>
      </Card>

      {/* 智能建议 */}
      <SmartSuggestions />

      {/* 学科占比 + 热力图 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">学科占比</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectPie bySubject={stats.bySubject} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">学习热力图</CardTitle>
          </CardHeader>
          <CardContent>
            <StudyHeatmap data={stats.heatmap} />
          </CardContent>
        </Card>
      </div>

      {/* 最近记录 + 待学概览 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4" /> 最近学习
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">还没有记录</p>
            ) : (
              recent.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline">{s.subject}</Badge>
                    <span className="truncate">{s.title}</span>
                  </div>
                  <span className="shrink-0 text-muted-foreground">
                    {formatDate(s.date)} · {formatDuration(s.duration)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4" /> 考点清单
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无考点 🎉</p>
            ) : (
              upcoming.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">
                    {t.title}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t.subject}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs">
                    <Badge variant="secondary">{PRIORITY_LABEL[t.priority]}</Badge>
                    <span className="ml-2 text-muted-foreground">
                      {TODO_STATUS_LABEL[t.status]}
                    </span>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
