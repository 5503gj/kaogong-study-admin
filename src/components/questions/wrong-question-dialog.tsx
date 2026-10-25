// 拍照记录错题对话框：可拍照 / 上传照片，并填写错因、错题种类、提升方案
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { compressPhoto } from '@/lib/photos'
import { Camera, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SUBJECTS, WRONG_REASONS, ERROR_TYPES } from '@/lib/constants'
import type { WrongQuestion, WrongReason } from '@/types'

export interface WrongQuestionInput {
  subject: string
  questionText?: string
  myAnswer?: string
  correctAnswer?: string
  analysis?: string
  whyWrong: WrongReason
  errorType?: string
  improvement?: string
  photo?: string
  mastered?: boolean
}

function WrongQuestionForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: WrongQuestion
  onSubmit: (data: WrongQuestionInput) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo)
  const [subject, setSubject] = useState<string>(
    initial?.subject ?? SUBJECTS[0],
  )
  const [questionText, setQuestionText] = useState(initial?.questionText ?? '')
  const [myAnswer, setMyAnswer] = useState(initial?.myAnswer ?? '')
  const [correctAnswer, setCorrectAnswer] = useState(
    initial?.correctAnswer ?? '',
  )
  const [analysis, setAnalysis] = useState(initial?.analysis ?? '')
  const [whyWrong, setWhyWrong] = useState<WrongReason>(
    initial?.whyWrong ?? '知识点盲区',
  )
  const [errorType, setErrorType] = useState(initial?.errorType ?? '')
  const [improvement, setImprovement] = useState(initial?.improvement ?? '')

  const [photoBusy, setPhotoBusy] = useState(false)
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoBusy(true)
    try {
      setPhoto(await compressPhoto(file))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片处理失败')
    } finally {
      setPhotoBusy(false)
    }
  }

  const submit = () => {
    if (!whyWrong || photoBusy) return
    if (!questionText.trim() && !correctAnswer.trim()) return
    onSubmit({
      subject,
      questionText: questionText.trim() || undefined,
      myAnswer: myAnswer.trim() || undefined,
      correctAnswer: correctAnswer.trim() || undefined,
      analysis: analysis.trim() || undefined,
      whyWrong,
      errorType: errorType.trim() || undefined,
      improvement: improvement.trim() || undefined,
      photo,
      mastered: initial?.mastered,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑错题' : '拍照记录错题'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* 照片：拍照或上传 */}
          <div className="space-y-1">
            <Label>错题照片（可拍照 / 上传）</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={photoBusy}
                capture="environment"
                className="hidden"
                onChange={onPickPhoto}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="size-4" /> 拍照 / 上传
              </Button>
              {photo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhoto(undefined)}
                >
                  <X className="size-4" /> 移除照片
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                手机端点击即调用相机
              </span>
            </div>
            {photo && (
              <img
                src={photo}
                alt="错题"
                className="mt-2 max-h-44 rounded-lg border object-contain"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>科目</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>为什么会错 *</Label>
              <Select
                value={whyWrong}
                onValueChange={(v) => setWhyWrong(v as WrongReason)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WRONG_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>题目内容</Label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="把题干 / 题目抄下来，或让照片替你记录"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>我的作答</Label>
              <Input
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                placeholder="你当时选了 / 写了什么"
              />
            </div>
            <div className="space-y-1">
              <Label>正确答案 / 要点</Label>
              <Input
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="标准答案 / 要点"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>解析 / 正确思路</Label>
            <Textarea
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              placeholder="正确答案为什么对？关键步骤是什么？"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>错题种类（细分）</Label>
              <Select value={errorType} onValueChange={setErrorType}>
                <SelectTrigger>
                  <SelectValue placeholder="选一种 / 留空自填" />
                </SelectTrigger>
                <SelectContent>
                  {ERROR_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>之后如何提升</Label>
              <Input
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
                placeholder="例如：每天限时刷 10 道同类题"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={submit}>保存错题</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function WrongQuestionDialog(
  props: Parameters<typeof WrongQuestionForm>[0],
) {
  return props.open ? (
    <WrongQuestionForm key={props.initial?.id ?? 'new'} {...props} />
  ) : null
}
