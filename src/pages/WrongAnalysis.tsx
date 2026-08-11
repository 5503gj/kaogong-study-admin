// 错题分析页：错因分布 / 科目分布图表 + 错题列表（照片、为什么错、错题种类、提升方案）+ 智能提升建议
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2,
  Lightbulb,
} from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useData } from "@/context/DataContext"
import { WRONG_REASONS, WRONG_REASON_COLOR, subjectColor } from "@/lib/constants"
import { WrongQuestionDialog, type WrongQuestionInput } from "@/components/questions/wrong-question-dialog"
import type { WrongQuestion, WrongReason } from "@/types"

export function WrongAnalysis() {
  const { wrongQuestions, updateWrongQuestion, removeWrongQuestion } = useData()
  const [edit, setEdit] = useState<WrongQuestion | null>(null)
  const [openEdit, setOpenEdit] = useState(false)

  const stats = useMemo(() => {
    const total = wrongQuestions.length
    const mastered = wrongQuestions.filter((w) => w.mastered).length
    const byReason: Record<string, number> = {}
    const bySubject: Record<string, number> = {}
    for (const w of wrongQuestions) {
      byReason[w.whyWrong] = (byReason[w.whyWrong] ?? 0) + 1
      bySubject[w.subject] = (bySubject[w.subject] ?? 0) + 1
    }
    const reasonArr = Object.entries(byReason)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
    const subjectArr = Object.entries(bySubject)
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
    const topReason = reasonArr[0]?.reason as WrongReason | undefined
    return { total, mastered, reasonArr, subjectArr, topReason }
  }, [wrongQuestions])

  const reasonConfig = useMemo(
    () =>
      Object.fromEntries(
        WRONG_REASONS.map((r) => [r.value, { label: r.label, color: WRONG_REASON_COLOR[r.value] }]),
      ),
    [],
  )

  const grouped = useMemo(() => {
    const m = new Map<WrongReason, WrongQuestion[]>()
    for (const w of wrongQuestions) {
      if (!m.has(w.whyWrong)) m.set(w.whyWrong, [])
      m.get(w.whyWrong)!.push(w)
    }
    return WRONG_REASONS.filter((r) => m.has(r.value)).map((r) => ({
      reason: r.value,
      items: m.get(r.value)!,
    }))
  }, [wrongQuestions])

  const improvements = useMemo(() => {
    const out: string[] = []
    const top = stats.topReason
    if (!top) return ["还没有错题记录。去「题库刷题」里『加入错题本』，或用「拍照记录错题」积累，这里会自动分析错因与提升方案。"]
    if (top === "审题失误" || top === "计算错误") {
      out.push("你的主要错因是「非知识性失误」，提分性价比最高：① 每题圈画关键词、问法读两遍再动笔；② 计算出结果后倒推验证；③ 做套卷严格限时，培养稳定节奏。")
    } else if (top === "知识点盲区" || top === "概念混淆") {
      out.push("你主要是「没学懂」：回到对应模块的方法论系统补漏，先看解析搞清考点，再限时重做同类题，直到能独立做对。")
    } else if (top === "时间不够") {
      out.push("这是时间管理问题：套卷先易后难、不会先跳过；资料分析与言语靠速算（截位直除）提速，把时间留给拿分题。")
    } else if (top === "方法不当") {
      out.push("你方法不对路：背熟各模块的『标准套路』（工程赋值法、图形规律体系、翻译推理等），用对方法比硬算快得多。")
    } else {
      out.push("结合你的错因分布，针对性补漏：先看解析搞清考点，再限时重做同类题。")
    }
    out.push("按『当天 → 第 2 天 → 第 7 天 → 第 15 天』间隔重复回做错题，把同类题归类训练，弄懂比刷量重要。")
    if (stats.subjectArr[0]) {
      out.push(`最薄弱科目是「${stats.subjectArr[0].subject}」（${stats.subjectArr[0].count} 题），建议每天定向加练 10~15 分钟。`)
    }
    return out
  }, [stats])

  const onEditSubmit = (data: WrongQuestionInput) => {
    if (edit) updateWrongQuestion(edit.id, data)
    setOpenEdit(false)
    setEdit(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">错题分析</h1>
        <p className="text-sm text-muted-foreground">
          找出为什么会错、错题的种类，并给出之后如何提升；支持拍照记录错题。
        </p>
      </div>

      {/* 统计卡 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="错题总数" value={stats.total} />
        <StatCard label="已掌握" value={stats.mastered} hint={stats.total ? `${Math.round((stats.mastered / stats.total) * 100)}%` : "—"} />
        <StatCard
          label="主要错因"
          value={stats.topReason ?? "—"}
          color={stats.topReason ? WRONG_REASON_COLOR[stats.topReason] : undefined}
        />
        <StatCard
          label="最薄弱科目"
          value={stats.subjectArr[0]?.subject ?? "—"}
          hint={stats.subjectArr[0] ? `${stats.subjectArr[0].count} 题` : undefined}
        />
      </div>

      {/* 图表 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">错因分布</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.reasonArr.length === 0 ? (
              <Empty />
            ) : (
              <ChartContainer config={reasonConfig} className="h-[240px] w-full">
                <BarChart data={stats.reasonArr} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="reason" tickLine={false} axisLine={false} tickMargin={6} />
                  <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4}>
                    {stats.reasonArr.map((d) => (
                      <Cell key={d.reason} fill={WRONG_REASON_COLOR[d.reason as WrongReason]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">按科目分布</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.subjectArr.length === 0 ? (
              <Empty />
            ) : (
              <ChartContainer
                config={Object.fromEntries(stats.subjectArr.map((s) => [s.subject, { label: s.subject }]))}
                className="h-[240px] w-full"
              >
                <BarChart data={stats.subjectArr} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="subject" tickLine={false} axisLine={false} tickMargin={6} />
                  <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4}>
                    {stats.subjectArr.map((d) => (
                      <Cell key={d.subject} fill={subjectColor(d.subject)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 智能提升建议 */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="size-4 text-primary" /> 智能提升建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {improvements.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 text-primary">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 错题列表（按错因分组） */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertTriangle className="mb-2 size-8" />
          还没有错题。去「题库刷题」加入错题本，或用「拍照记录错题」开始积累。
        </div>
      ) : (
        grouped.map((g) => (
          <div key={g.reason} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge style={{ backgroundColor: WRONG_REASON_COLOR[g.reason] + "20", color: WRONG_REASON_COLOR[g.reason], borderColor: WRONG_REASON_COLOR[g.reason] + "60" }}>
                {g.reason}
              </Badge>
              <span className="text-xs text-muted-foreground">{g.items.length} 题</span>
            </div>
            <div className="space-y-3">
              {g.items.map((w) => (
                <WrongCard
                  key={w.id}
                  w={w}
                  onEdit={() => {
                    setEdit(w)
                    setOpenEdit(true)
                  }}
                  onToggleMaster={() => updateWrongQuestion(w.id, { mastered: !w.mastered })}
                  onDelete={() => removeWrongQuestion(w.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <WrongQuestionDialog
        open={openEdit}
        onOpenChange={(v) => {
          setOpenEdit(v)
          if (!v) setEdit(null)
        }}
        initial={edit ?? undefined}
        onSubmit={onEditSubmit}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string
  value: string | number
  hint?: string
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold" style={color ? { color } : undefined}>
          {value}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
}

function Empty() {
  return <p className="text-sm text-muted-foreground">暂无数据</p>
}

function WrongCard({
  w,
  onEdit,
  onToggleMaster,
  onDelete,
}: {
  w: WrongQuestion
  onEdit: () => void
  onToggleMaster: () => void
  onDelete: () => void
}) {
  return (
    <Card className={w.mastered ? "opacity-70" : undefined}>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{w.subject}</Badge>
          <Badge style={{ backgroundColor: WRONG_REASON_COLOR[w.whyWrong] + "20", color: WRONG_REASON_COLOR[w.whyWrong], borderColor: WRONG_REASON_COLOR[w.whyWrong] + "60" }}>
            {w.whyWrong}
          </Badge>
          {w.errorType && <Badge variant="outline">{w.errorType}</Badge>}
          {w.mastered && (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
              <CheckCircle2 className="mr-1 size-3" /> 已掌握
            </Badge>
          )}
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" onClick={onToggleMaster}>
              <CheckCircle2 className="size-3.5" /> {w.mastered ? "标回未掌握" : "标记掌握"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="size-3.5" /> 编辑
            </Button>
            <Button size="sm" variant="ghost" className="text-rose-600" onClick={onDelete}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {w.photo && (
          <img src={w.photo} alt="错题" className="max-h-40 rounded-lg border object-contain" />
        )}

        {w.questionText && (
          <p className="text-sm leading-relaxed">
            <span className="font-medium">题目：</span>
            {w.questionText}
          </p>
        )}

        {(w.myAnswer || w.correctAnswer) && (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {w.myAnswer && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2">
                <span className="font-medium text-rose-600">我的作答：</span>
                {w.myAnswer}
              </div>
            )}
            {w.correctAnswer && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                <span className="font-medium text-emerald-600">正确答案：</span>
                {w.correctAnswer}
              </div>
            )}
          </div>
        )}

        {w.analysis && (
          <div className="text-sm">
            <span className="font-medium">解析：</span>
            <span className="text-muted-foreground">{w.analysis}</span>
          </div>
        )}

        {w.improvement && (
          <>
            <Separator />
            <div className="text-sm">
              <span className="font-medium text-primary">如何提升：</span>
              <span className="text-muted-foreground">{w.improvement}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
