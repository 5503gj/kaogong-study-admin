// 学习记录表格：搜索 / 筛选 / 分页 / 编辑 / 删除
import { useMemo, useState } from "react"
import { Pencil, Trash2, Search } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, formatDuration } from "@/lib/format"
import { SESSION_STATUS_LABEL, subjectColor } from "@/lib/constants"
import type { StudySession } from "@/types"

interface Props {
  sessions: StudySession[]
  onEdit: (s: StudySession) => void
  onDelete: (s: StudySession) => void
}

const PAGE_SIZE = 8

export function RecordsTable({ sessions, onEdit, onDelete }: Props) {
  const [q, setQ] = useState("")
  const [subject, setSubject] = useState("all")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)

  const subjects = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.subject))),
    [sessions],
  )

  const filtered = useMemo(() => {
    return sessions
      .filter((s) =>
        q
          ? `${s.title}${s.subject}${s.notes ?? ""}`
              .toLowerCase()
              .includes(q.toLowerCase())
          : true,
      )
      .filter((s) => (subject === "all" ? true : s.subject === subject))
      .filter((s) => (status === "all" ? true : s.status === status))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [sessions, q, subject, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="space-y-3">
      {/* 筛选栏 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索内容 / 科目 / 备注"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={subject}
          onValueChange={(v) => {
            setSubject(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="全部科目" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部科目</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="reviewing">复习中</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 表格（横向滚动以适配移动端） */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>科目</TableHead>
                <TableHead>备考内容</TableHead>
                <TableHead className="text-right">时长</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    没有符合条件的记录
                  </TableCell>
                </TableRow>
              ) : (
                pageData.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(s.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: subjectColor(s.subject),
                          color: subjectColor(s.subject),
                        }}
                      >
                        {s.subject}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {s.title}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatDuration(s.duration)}
                    </TableCell>
                    <TableCell>{SESSION_STATUS_LABEL[s.status]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(s)}
                          aria-label="编辑"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(s)}
                          aria-label="删除"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          共 {filtered.length} 条 · 第 {safePage}/{totalPages} 页
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  )
}
