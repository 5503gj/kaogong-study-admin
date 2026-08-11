// 通用指标卡片（KPI 卡）
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: ReactNode
  hint?: string
  icon?: LucideIcon
  color?: string // 图标强调色（hex），用于彩色图标底
  className?: string
}

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  color,
  className,
}: StatCardProps) {
  const tint = color ?? "hsl(var(--primary))"
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className="flex size-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: tint + "1a", color: tint }}
          >
            <Icon className="size-4" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
