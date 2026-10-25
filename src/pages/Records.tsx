// 学习记录页：列表管理 + 新增 / 编辑 / 删除
import { useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecordsTable } from "@/components/records/records-table"
import {
  RecordFormDialog,
  type SessionFormValues,
} from "@/components/records/record-form-dialog"
import { useData } from "@/context/data"
import type { StudySession } from "@/types"

export function Records() {
  const { sessions, addSession, updateSession, removeSession } = useData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<StudySession | null>(null)

  const handleAdd = () => {
    setEditing(null)
    setOpen(true)
  }
  const handleEdit = (s: StudySession) => {
    setEditing(s)
    setOpen(true)
  }
  const handleDelete = (s: StudySession) => {
    if (window.confirm(`确定删除「${s.title}」这条记录吗？`)) {
      removeSession(s.id)
      toast.success("已删除")
    }
  }
  const handleSubmit = (v: SessionFormValues) => {
    if (editing) {
      updateSession(editing.id, v)
      toast.success("已更新")
    } else {
      addSession(v)
      toast.success("已添加")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">备考记录</h1>
          <p className="text-sm text-muted-foreground">
            管理每一次学习：时间、内容、时长与状态。
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="size-4" /> 新增记录
        </Button>
      </div>

      <RecordsTable sessions={sessions} onEdit={handleEdit} onDelete={handleDelete} />

      <RecordFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
