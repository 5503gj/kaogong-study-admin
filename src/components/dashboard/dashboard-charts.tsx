// 看板图表：学习趋势（面积图）+ 学科占比（环形图）+ 学习时长视图（折线图）
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { format, parseISO } from "date-fns"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { PeriodPoint, SubjectStat, TrendPoint } from "@/lib/stats"
import { subjectColor } from "@/lib/constants"

const trendConfig = {
  minutes: { label: "学习时长(分钟)", color: "hsl(var(--primary))" },
} satisfies Record<string, { label: string; color: string }>

export function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const data = trend.map((t) => ({
    ...t,
    label: format(parseISO(t.date), "MM/dd"),
  }))
  return (
    <ChartContainer config={trendConfig} className="h-[240px] w-full">
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 10 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="minutes"
          type="monotone"
          fill="var(--color-minutes)"
          fillOpacity={0.3}
          stroke="var(--color-minutes)"
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function SubjectPie({ bySubject }: { bySubject: SubjectStat[] }) {
  const data = bySubject.map((s) => ({
    subject: s.subject,
    minutes: s.minutes,
    fill: subjectColor(s.subject),
  }))
  const config = Object.fromEntries(
    bySubject.map((s) => [s.subject, { label: s.subject }]),
  )
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无数据</p>
  }
  return (
    <ChartContainer
      config={config}
      className="mx-auto h-[240px] w-full max-w-[260px]"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="subject" />} />
        <Pie
          data={data}
          dataKey="minutes"
          nameKey="subject"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.subject} fill={d.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

// 自定义 tooltip：折线图悬停时展示该周期的学习时长 + 当日内容
function LineTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: PeriodPoint }[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0].payload
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">
        {p.label} · 共 {p.minutes} 分钟
      </div>
      {p.content.length > 0 ? (
        <ul className="max-h-32 space-y-0.5 overflow-auto">
          {p.content.map((c, i) => (
            <li key={i} className="text-muted-foreground">
              · {c}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-muted-foreground">该周期暂无明细</div>
      )}
    </div>
  )
}

/** 学习时长视图：日 / 周 / 月 / 年 折线图 */
export function StudyLineChart({ points }: { points: PeriodPoint[] }) {
  return (
    <ChartContainer config={trendConfig} className="h-[260px] w-full">
      <LineChart data={points} margin={{ left: -16, right: 8, top: 10 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<LineTooltip />} />
        <Line
          dataKey="minutes"
          type="monotone"
          stroke="var(--color-minutes)"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
