// GitHub 风格的学习热力图（最近 ~119 天）
import { useMemo } from "react"
import { getDay, parseISO } from "date-fns"

export function StudyHeatmap({
  data,
}: {
  data: { date: string; minutes: number }[]
}) {
  const { cells, max, weeks } = useMemo(() => {
    if (data.length === 0)
      return {
        cells: [] as (null | { date: string; minutes: number })[],
        max: 60,
        weeks: 0,
      }
    const first = getDay(parseISO(data[0].date))
    const padded: (null | { date: string; minutes: number })[] = [
      ...Array(first).fill(null),
      ...data.map((d) => ({ date: d.date, minutes: d.minutes })),
    ]
    const m = Math.max(60, ...data.map((d) => d.minutes))
    return { cells: padded, max: m, weeks: Math.ceil(padded.length / 7) }
  }, [data])

  const level = (mins: number) => {
    if (!mins || mins <= 0) return 0
    const r = mins / max
    if (r > 0.75) return 4
    if (r > 0.5) return 3
    if (r > 0.25) return 2
    return 1
  }
  const colorClass = (l: number) =>
    [
      "bg-muted",
      "bg-emerald-200 dark:bg-emerald-900",
      "bg-emerald-400 dark:bg-emerald-700",
      "bg-emerald-500 dark:bg-emerald-600",
      "bg-emerald-600 dark:bg-emerald-500",
    ][l]

  if (cells.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无学习数据</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div
          className="grid gap-1"
          style={{
            gridTemplateRows: "repeat(7, minmax(0, 1fr))",
            gridAutoFlow: "column",
          }}
        >
          {cells.map((c, i) =>
            c === null ? (
              <div key={`e${i}`} className="size-3" />
            ) : (
              <div
                key={c.date}
                title={`${c.date}：${c.minutes} 分钟`}
                className={`size-3 rounded-sm ${colorClass(level(c.minutes))}`}
              />
            ),
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={`size-3 rounded-sm ${colorClass(l)}`} />
        ))}
        <span>多</span>
        <span className="ml-2">最近 {weeks} 周</span>
      </div>
    </div>
  )
}
