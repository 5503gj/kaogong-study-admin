// 智能建议卡：基于学习数据实时生成建议（本地规则引擎）
import { useMemo } from "react"
import { AlertTriangle, Lightbulb, CheckCircle2, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/DataContext"
import { buildSuggestions, type SuggestionLevel } from "@/lib/ai"

const META: Record<
  SuggestionLevel,
  { icon: typeof Lightbulb; cls: string }
> = {
  warn: { icon: AlertTriangle, cls: "border-destructive/40 bg-destructive/5" },
  tip: { icon: Lightbulb, cls: "border-amber-500/40 bg-amber-500/5" },
  good: { icon: CheckCircle2, cls: "border-emerald-500/40 bg-emerald-500/5" },
}

export function SmartSuggestions() {
  const { sessions, todos, dailyTasks, goal, wrongQuestions } = useData()
  const suggestions = useMemo(
    () => buildSuggestions(sessions, todos, dailyTasks, goal, wrongQuestions),
    [sessions, todos, dailyTasks, goal, wrongQuestions],
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" /> 智能建议
          <span className="text-xs font-normal text-muted-foreground">
            根据你的数据实时生成
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((s) => {
          const m = META[s.level]
          const Icon = m.icon
          return (
            <div
              key={s.id}
              className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${m.cls}`}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span>{s.text}</span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
