// 题库 / 刷题页：按科目筛选、限时作答、查看解析与考点；错题本管理（基于 bankId）
// 新增题目改为「拍照记录错题」，引导到错题分析页统一管理
import { useMemo, useState } from "react"
import { Camera, Library, BookMarked } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useData } from "@/context/data"
import { SUBJECTS } from "@/lib/constants"
import { QuestionCard } from "@/components/questions/question-card"
import { WrongQuestionDialog, type WrongQuestionInput } from "@/components/questions/wrong-question-dialog"
import type { QuestionBankItem } from "@/types"

const FILTERS = ["全部", ...SUBJECTS] as const

export function QuestionBank() {
  const { questionBank, wrongQuestions, addWrongQuestion } = useData()
  const [active, setActive] = useState<string>("全部")
  const [wrongOnly, setWrongOnly] = useState(false)
  const [openWrong, setOpenWrong] = useState(false)

  // 由题库题生成的错题（用于「只看错题本」过滤与卡片标记）
  const wrongBankIds = useMemo(
    () => new Set(wrongQuestions.map((w) => w.bankId).filter(Boolean) as string[]),
    [wrongQuestions],
  )

  const list = useMemo(() => {
    return questionBank.filter((q: QuestionBankItem) => {
      if (active !== "全部" && q.subject !== active) return false
      if (wrongOnly && !wrongBankIds.has(q.id)) return false
      return true
    })
  }, [questionBank, active, wrongOnly, wrongBankIds])

  const submitWrong = (data: WrongQuestionInput) => addWrongQuestion(data)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">题库 / 刷题</h1>
          <p className="text-sm text-muted-foreground">
            考公真题风格题库：限时作答、即时判分、看解析与考点；弱项一键入错题本。
          </p>
        </div>
        <Button onClick={() => setOpenWrong(true)}>
          <Camera className="size-4" /> 拍照记录错题
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="flex-wrap">
            {FILTERS.map((f) => (
              <TabsTrigger key={f} value={f}>
                {f}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          <BookMarked className="size-4 text-muted-foreground" />
          <Label htmlFor="wrong-only" className="text-sm">
            只看错题本（{wrongBankIds.size}）
          </Label>
          <Switch id="wrong-only" checked={wrongOnly} onCheckedChange={setWrongOnly} />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
          <Library className="mb-2 size-8" />
          {wrongOnly
            ? "错题本里还没有来自题库的题目，去刷几道并『加入错题本』吧。"
            : "该科目暂无题目。"}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}
        </div>
      )}

      <WrongQuestionDialog
        open={openWrong}
        onOpenChange={setOpenWrong}
        onSubmit={submitWrong}
      />
    </div>
  )
}
