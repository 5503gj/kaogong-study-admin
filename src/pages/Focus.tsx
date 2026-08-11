// 专注模式：全屏计时 + 防切出追踪 + 结束警醒
// 通过 visibilitychange / window blur 检测切出，记录次数与离开时长，结束时汇总警醒
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Play,
  Square,
  Timer,
  AlertTriangle,
  CheckCircle2,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/DataContext"
import { formatDate, todayISO } from "@/lib/format"

function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
}

export function Focus() {
  const { sessions, focusSessions, addFocusSession, addSession } = useData()

  // 基础科目（用于下拉建议）
  const subjects = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.subject))),
    [sessions],
  )

  // 配置
  const [subject, setSubject] = useState("")
  const [planned, setPlanned] = useState(25)
  const [note, setNote] = useState("")

  // 运行态
  const [active, setActive] = useState(false)
  const [elapsed, setElapsed] = useState(0) // 有效专注秒数
  const [switchCount, setSwitchCount] = useState(0)
  const [awaySeconds, setAwaySeconds] = useState(0)
  const [warn, setWarn] = useState<string | null>(null)

  // 结束汇总
  const [summary, setSummary] = useState<null | {
    effective: number
    wall: number
    switchCount: number
    awaySeconds: number
    planned: number
  }>(null)

  // refs（避免事件闭包拿到旧值）
  const startRef = useRef(0)
  const isAwayRef = useRef(false)
  const awayStartRef = useRef<number | null>(null)
  const switchRef = useRef(0)
  const awayTotalRef = useRef(0)

  // 启动专注
  const start = () => {
    const subj = subject.trim() || "综合学习"
    startRef.current = Date.now()
    isAwayRef.current = false
    awayStartRef.current = null
    switchRef.current = 0
    awayTotalRef.current = 0
    setElapsed(0)
    setSwitchCount(0)
    setAwaySeconds(0)
    setWarn(null)
    setSummary(null)
    setActive(true)
    setSubject(subj)
  }

  // 结束专注
  const end = () => {
    const wall = (Date.now() - startRef.current) / 1000
    const effective = wall - awayTotalRef.current
    addFocusSession({
      startedAt: startRef.current,
      endedAt: Date.now(),
      plannedMinutes: planned,
      subject: subject.trim() || "综合学习",
      note: note.trim() || undefined,
      switchCount: switchRef.current,
      awaySeconds: Math.round(awayTotalRef.current),
    })
    // 同步记入「备考记录」，便于看板统计学习时长与学科占比
    addSession({
      date: todayISO(),
      subject: subject.trim() || "综合学习",
      title: note.trim()
        ? `专注：${note.trim()}`
        : `专注学习：${subject.trim() || "综合学习"}`,
      duration: Math.max(1, Math.round(effective / 60)),
      status: "completed",
      notes: `专注模式生成 · 计划 ${planned} 分钟 · 切出 ${switchRef.current} 次`,
    })
    setSummary({
      effective: Math.round(effective),
      wall: Math.round(wall),
      switchCount: switchRef.current,
      awaySeconds: Math.round(awayTotalRef.current),
      planned: planned,
    })
    setActive(false)
  }

  // 监听切出事件（仅在 active 时）
  useEffect(() => {
    if (!active) return

    const leave = () => {
      if (!isAwayRef.current) {
        isAwayRef.current = true
        awayStartRef.current = Date.now()
        switchRef.current += 1
        setSwitchCount(switchRef.current)
      }
    }
    const ret = () => {
      if (isAwayRef.current && awayStartRef.current != null) {
        const dt = (Date.now() - awayStartRef.current) / 1000
        awayTotalRef.current += dt
        awayStartRef.current = null
        isAwayRef.current = false
        setAwaySeconds(Math.round(awayTotalRef.current))
        setWarn(
          `检测到切出！本次离开约 ${Math.round(dt)} 秒，累计已切出 ${switchRef.current} 次。`,
        )
      }
    }
    const onVisibility = () => (document.hidden ? leave() : ret())
    const onBlur = () => leave()
    const onFocus = () => ret()
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    window.addEventListener("beforeunload", onBeforeUnload)

    // 每秒刷新有效专注时长
    const tick = setInterval(() => {
      const now = Date.now()
      const wall = (now - startRef.current) / 1000
      const liveAway =
        awayTotalRef.current +
        (isAwayRef.current && awayStartRef.current != null
          ? (now - awayStartRef.current) / 1000
          : 0)
      setElapsed(Math.max(0, wall - liveAway))
    }, 1000)

    // 自动隐藏警告
    const warnTimer = setInterval(() => setWarn(null), 4000)

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("beforeunload", onBeforeUnload)
      clearInterval(tick)
      clearInterval(warnTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // 结束汇总文案（警醒）
  const verdict = useMemo(() => {
    if (!summary) return null
    const msgs: { level: "good" | "warn"; text: string }[] = []
    if (summary.switchCount === 0 && summary.awaySeconds === 0) {
      msgs.push({ level: "good", text: "完美专注！全程没有切出，心流没有被打断，继续保持这种状态。" })
    } else {
      msgs.push({
        level: "warn",
        text: `本次切出 ${summary.switchCount} 次、累计离开 ${Math.round(
          summary.awaySeconds / 60,
        )} 分钟，这明显打断了你的专注。下次把手机放远、关掉无关通知，用 25 分钟番茄钟，抗干扰会强很多。`,
      })
    }
    if (summary.effective >= summary.planned * 60) {
      msgs.push({ level: "good", text: `达成计划：有效专注 ${mmss(summary.effective)} ≥ 目标 ${summary.planned} 分钟 ✅` })
    } else {
      msgs.push({
        level: "warn",
        text: `未达标：有效专注 ${mmss(summary.effective)}，距计划的 ${summary.planned} 分钟还差 ${Math.max(
          0,
          summary.planned * 60 - summary.effective,
        ) / 60 < 1 ? `${Math.round(summary.planned * 60 - summary.effective)} 秒` : `${Math.round((summary.planned * 60 - summary.effective) / 60)} 分钟`}。`,
      })
    }
    return msgs
  }, [summary])

  // ====== 运行中：全屏覆盖层（锁定导航）======
  if (active) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm">
        {warn && (
          <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <AlertTriangle className="mr-1 inline size-4" />
            {warn}
          </div>
        )}

        <div className="text-center">
          <div className="text-sm text-muted-foreground">正在专注</div>
          <div className="text-lg font-semibold">{subject}</div>
          {note && <div className="mt-1 text-sm text-muted-foreground">目标：{note}</div>}
        </div>

        <div className="font-mono text-7xl font-bold tabular-nums">
          {mmss(elapsed)}
        </div>

        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>计划 {planned} 分钟</span>
          <span className={switchCount > 0 ? "text-destructive" : ""}>
            切出 {switchCount} 次
          </span>
          <span className={awaySeconds > 0 ? "text-destructive" : ""}>
            离开 {mmss(awaySeconds)}
          </span>
        </div>

        <Button size="lg" variant="destructive" onClick={end}>
          <Square className="size-4" /> 结束专注
        </Button>
        <p className="px-6 text-center text-xs text-muted-foreground">
          切出页面 / 切换窗口 / 最小化都会被记录并提醒，专注完再走。
        </p>
      </div>
    )
  }

  // ====== 结束汇总弹层 ======
  if (summary) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="size-5 text-primary" /> 专注结束 · 警醒报告
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold tabular-nums">{mmss(summary.effective)}</div>
                <div className="text-xs text-muted-foreground">有效专注</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold tabular-nums">{summary.switchCount}</div>
                <div className="text-xs text-muted-foreground">切出次数</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold tabular-nums">{mmss(summary.awaySeconds)}</div>
                <div className="text-xs text-muted-foreground">离开时长</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold tabular-nums">{summary.planned}'</div>
                <div className="text-xs text-muted-foreground">计划时长</div>
              </div>
            </div>

            <div className="space-y-2">
              {verdict?.map((v, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${
                    v.level === "good"
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-destructive/40 bg-destructive/5"
                  }`}
                >
                  {v.level === "good" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <span>{v.text}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              本次专注已自动记入「备考记录」，看板的时长与学科占比会同步更新。
            </div>
            <Button className="w-full" onClick={() => setSummary(null)}>
              完成
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ====== 准备页 + 历史 ======
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">专注模式</h1>
        <p className="text-sm text-muted-foreground">
          锁屏计时，切出会被记录并警醒。把手机放远，开始一段不被打断的学习。
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="size-4" /> 开始一次专注
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              list="focus-subjects"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="专注科目，例如：算法"
            />
            <datalist id="focus-subjects">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <div className="flex items-center gap-2 sm:w-48">
              <span className="text-sm text-muted-foreground">计划</span>
              <Input
                type="number"
                min={1}
                value={planned}
                onChange={(e) => setPlanned(Math.max(1, Number(e.target.value) || 1))}
              />
              <span className="text-sm text-muted-foreground">分钟</span>
            </div>
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="本次专注目标（可选），例如：刷 3 道二叉树题"
          />
          <Button onClick={start} size="lg" className="w-full sm:w-auto">
            <Play className="size-4" /> 开始专注
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" /> 专注历史
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {focusSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有专注记录，开始第一次吧。</p>
          ) : (
            focusSessions.slice(0, 10).map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="outline">{f.subject}</Badge>
                  <span className="text-muted-foreground">
                    {formatDate(f.startedAt, "MM-dd HH:mm")}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span>专注 {mmss((f.endedAt - f.startedAt) / 1000 - f.awaySeconds)}</span>
                  <span className={f.switchCount > 0 ? "text-destructive" : ""}>
                    切出 {f.switchCount}
                  </span>
                  <span className={f.awaySeconds > 0 ? "text-destructive" : ""}>
                    离开 {mmss(f.awaySeconds)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
