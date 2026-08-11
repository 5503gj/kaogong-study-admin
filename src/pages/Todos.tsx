// 待学清单页：看板式（待学 / 进行中 / 已完成）+ 状态流转
import { useState } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TodoFormDialog,
  type TodoFormValues,
} from "@/components/todos/todo-form-dialog"
import { useData } from "@/context/DataContext"
import {
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  TODO_STATUS_LABEL,
  TODO_STATUS_ORDER,
  subjectColor,
} from "@/lib/constants"
import type { TodoItem, TodoStatus } from "@/types"

const NEXT: Record<TodoStatus, TodoStatus | null> = {
  todo: "doing",
  doing: "done",
  done: null,
}
const PREV: Record<TodoStatus, TodoStatus | null> = {
  todo: null,
  doing: "todo",
  done: "doing",
}

export function Todos() {
  const { todos, addTodo, updateTodo, removeTodo } = useData()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TodoItem | null>(null)

  const handleAdd = () => {
    setEditing(null)
    setOpen(true)
  }
  const handleEdit = (t: TodoItem) => {
    setEditing(t)
    setOpen(true)
  }
  const handleDelete = (t: TodoItem) => {
    if (window.confirm(`确定删除「${t.title}」吗？`)) {
      removeTodo(t.id)
      toast.success("已删除")
    }
  }
  const move = (t: TodoItem, to: TodoStatus) => {
    updateTodo(t.id, {
      status: to,
      completedAt: to === "done" ? Date.now() : undefined,
    })
  }
  const handleSubmit = (v: TodoFormValues) => {
    if (editing) {
      updateTodo(editing.id, v)
      toast.success("已更新")
    } else {
      addTodo(v)
      toast.success("已添加")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">考点清单</h1>
          <p className="text-sm text-muted-foreground">
            把「我还需要学什么」列出来，逐个推进。
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="size-4" /> 新增考点项
        </Button>
      </div>

      {/* 看板：移动端单列，桌面三列 */}
      <div className="grid gap-4 md:grid-cols-3">
        {TODO_STATUS_ORDER.map((status) => {
          const items = todos.filter((t) => t.status === status)
          return (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  {TODO_STATUS_LABEL[status]}
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无</p>
                ) : (
                  items.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border p-3 text-sm space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium leading-snug">{t.title}</span>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleEdit(t)}
                            aria-label="编辑"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleDelete(t)}
                            aria-label="删除"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: subjectColor(t.subject),
                            color: subjectColor(t.subject),
                          }}
                        >
                          {t.subject}
                        </Badge>
                        <Badge variant={PRIORITY_BADGE[t.priority]}>
                          {PRIORITY_LABEL[t.priority]}
                        </Badge>
                        {t.targetDate && (
                          <span className="text-muted-foreground">
                            目标 {t.targetDate}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {PREV[status] && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => move(t, PREV[status]!)}
                          >
                            <ArrowLeft className="size-3.5" /> 退回
                          </Button>
                        )}
                        {NEXT[status] && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => move(t, NEXT[status]!)}
                          >
                            推进 <ArrowRight className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <TodoFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
