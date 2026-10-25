// 待学项新增 / 编辑弹窗（「我还需要学什么」）
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { PRIORITY_LABEL, TODO_STATUS_LABEL } from '@/lib/constants'
import type { Priority, TodoItem, TodoStatus } from '@/types'

export interface TodoFormValues {
  subject: string
  title: string
  priority: Priority
  status: TodoStatus
  targetDate?: string
  notes?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: TodoItem | null
  onSubmit: (values: TodoFormValues) => void
}

function TodoForm({ open, onOpenChange, initial, onSubmit }: Props) {
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [priority, setPriority] = useState<Priority>(
    initial?.priority ?? 'medium',
  )
  const [status, setStatus] = useState<TodoStatus>(initial?.status ?? 'todo')
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const handleSubmit = () => {
    if (!subject.trim() || !title.trim()) {
      toast.error('请填写科目和学习内容')
      return
    }
    onSubmit({
      subject: subject.trim(),
      title: title.trim(),
      priority,
      status,
      targetDate: targetDate || undefined,
      notes: notes.trim() || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑待学项' : '新增待学项'}</DialogTitle>
          <DialogDescription>记录你「还需要学什么」。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-subject">科目</Label>
              <Input
                id="t-subject"
                placeholder="例如：算法"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-date">目标日期</Label>
              <Input
                id="t-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-title">学习内容</Label>
            <Input
              id="t-title"
              placeholder="例如：刷 10 道二叉树题目"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>优先级</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PRIORITY_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TodoStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TODO_STATUS_LABEL) as TodoStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TODO_STATUS_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-notes">备注</Label>
            <Textarea
              id="t-notes"
              placeholder="可选"
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

export function TodoFormDialog(props: Props) {
  return props.open ? (
    <TodoForm key={props.initial?.id ?? 'new'} {...props} />
  ) : null
}
