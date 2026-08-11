// 学习记录新增 / 编辑弹窗
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { todayISO } from "@/lib/format"
import { SESSION_STATUS_LABEL } from "@/lib/constants"
import type { SessionStatus, StudySession } from "@/types"

export interface SessionFormValues {
  date: string
  subject: string
  title: string
  duration: number
  status: SessionStatus
  rating?: number
  notes?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: StudySession | null
  onSubmit: (values: SessionFormValues) => void
}

export function RecordFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [date, setDate] = useState(todayISO())
  const [subject, setSubject] = useState("")
  const [title, setTitle] = useState("")
  const [duration, setDuration] = useState("60")
  const [status, setStatus] = useState<SessionStatus>("completed")
  const [rating, setRating] = useState("3")
  const [notes, setNotes] = useState("")

  // 打开时根据 initial 填充（编辑模式）
  useEffect(() => {
    if (open) {
      if (initial) {
        setDate(initial.date)
        setSubject(initial.subject)
        setTitle(initial.title)
        setDuration(String(initial.duration))
        setStatus(initial.status)
        setRating(String(initial.rating ?? 3))
        setNotes(initial.notes ?? "")
      } else {
        setDate(todayISO())
        setSubject("")
        setTitle("")
        setDuration("60")
        setStatus("completed")
        setRating("3")
        setNotes("")
      }
    }
  }, [open, initial])

  const handleSubmit = () => {
    const dur = Number(duration)
    if (!date || !subject.trim() || !title.trim()) {
      toast.error("请填写日期、科目和备考内容")
      return
    }
    if (!Number.isFinite(dur) || dur <= 0) {
      toast.error("时长需为正整数")
      return
    }
    onSubmit({
      date,
      subject: subject.trim(),
      title: title.trim(),
      duration: dur,
      status,
      rating: Number(rating),
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initial ? "编辑备考记录" : "新增备考记录"}</DialogTitle>
          <DialogDescription>
            记录一次备考：日期、科目、内容与时长。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-date">日期</Label>
              <Input
                id="r-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-duration">时长（分钟）</Label>
              <Input
                id="r-duration"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-subject">科目</Label>
            <Input
              id="r-subject"
              placeholder="例如：资料分析"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-title">备考内容</Label>
            <Input
              id="r-title"
              placeholder="例如：做一套行测模拟卷"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SessionStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SESSION_STATUS_LABEL) as SessionStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SESSION_STATUS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>自评掌握度</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} 分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-notes">备注</Label>
            <Textarea
              id="r-notes"
              placeholder="可选：心得、难点、待办等"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
