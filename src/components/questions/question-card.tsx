// 题库题目卡片：选择题可作答并即时判分，非选择题可展开参考答案；支持加入错题本
import { useState } from "react"
import { CheckCircle2, XCircle, BookMarked, BookOpen } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { QuestionBankItem } from "@/types"
import { useData } from "@/context/data"

const DIFF: Record<string, { label: string; cls: string }> = {
  easy: { label: "简单", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  medium: { label: "中等", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  hard: { label: "较难", cls: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
}

function firstLetter(s: string): string {
  const m = s.trim().match(/^[A-Za-z]/)
  return m ? m[0].toUpperCase() : s
}

export function QuestionCard({ q }: { q: QuestionBankItem }) {
  const { wrongQuestions, toggleWrong } = useData()
  const isWrong = wrongQuestions.some((w) => w.bankId === q.id)
  const isChoice = !!q.options && q.options.length > 0
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const correct = submitted && selected === q.answer

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{q.subject}</Badge>
          <Badge variant="outline">{q.type}</Badge>
          {q.difficulty && (
            <Badge variant="outline" className={DIFF[q.difficulty].cls}>
              {DIFF[q.difficulty].label}
            </Badge>
          )}
          {q.knowledgePoint && (
            <span className="text-xs text-muted-foreground">
              考点：{q.knowledgePoint}
            </span>
          )}
          <Button
            size="sm"
            variant={isWrong ? "default" : "outline"}
            className="ml-auto"
            onClick={() => toggleWrong(q.id)}
          >
            {isWrong ? (
              <BookMarked className="size-3.5" />
            ) : (
              <BookOpen className="size-3.5" />
            )}
            {isWrong ? "已在错题本" : "加入错题本"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium leading-relaxed">{q.question}</p>

        {isChoice ? (
          <div className="space-y-2">
            {q.options!.map((opt) => {
              const letter = firstLetter(opt)
              const isSel = selected === letter
              let cls = "justify-start text-left h-auto whitespace-normal"
              if (submitted) {
                if (letter === q.answer)
                  cls += " border-emerald-500 bg-emerald-500/10"
                else if (isSel && letter !== q.answer)
                  cls += " border-rose-500 bg-rose-500/10"
              } else if (isSel) cls += " border-primary bg-primary/5"
              return (
                <Button
                  key={letter}
                  variant="outline"
                  className={cls}
                  disabled={submitted}
                  onClick={() => setSelected(letter)}
                >
                  {opt}
                </Button>
              )
            })}
            {!submitted ? (
              <Button onClick={() => setSubmitted(true)} disabled={!selected}>
                提交答案
              </Button>
            ) : (
              <div className="space-y-2">
                <div
                  className={`flex items-center gap-1.5 text-sm font-medium ${
                    correct ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {correct ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  {correct ? "回答正确" : `回答错误，正确答案：${q.answer}`}
                </div>
                <Separator />
                <div className="text-sm">
                  <p className="mb-1 font-medium">解析</p>
                  <p className="text-muted-foreground">{q.analysis}</p>
                </div>
                {!isWrong && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleWrong(q.id)}
                  >
                    记到错题本
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? "收起参考答案" : "显示参考答案 / 解析"}
            </Button>
            {revealed && (
              <div className="space-y-2 rounded-lg border p-3 text-sm">
                <div>
                  <p className="mb-1 font-medium">参考答案</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {q.answer}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="mb-1 font-medium">解析</p>
                  <p className="text-muted-foreground">{q.analysis}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
