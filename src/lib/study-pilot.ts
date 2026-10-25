import type { DailyTask, StudySession, WrongQuestion } from '@/types'

export type PilotMode = 'balanced' | 'weakness' | 'sprint'
export interface PilotInput {
  startDate: string
  minutes: number
  days: number
  mode: PilotMode
  sessions: StudySession[]
  wrongQuestions: WrongQuestion[]
}
export interface Diagnosis {
  subject: string
  errors: number
  minutes: number
  reason: string
}
export interface PlanTask extends DailyTask {
  minutes: number
  reason: string
  kind: 'practice' | 'review'
}
export interface PilotPlan {
  startDate: string
  mode: PilotMode
  budget: number
  days: number
  diagnosis: Diagnosis[]
  tasks: PlanTask[]
  evidence: string[]
}
export interface PilotEvent {
  tool: string
  label: string
  detail: string
  status: 'running' | 'done' | 'cancelled'
  count?: number
}

export function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
export function addDays(date: string, count: number) {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + count)
  return localDate(value)
}
function validInput(input: PilotInput) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) ||
    addDays(input.startDate, 0) !== input.startDate
  )
    throw new Error('开始日期无效')
  if (
    !Number.isInteger(input.minutes) ||
    input.minutes < 10 ||
    input.minutes > 240
  )
    throw new Error('每日新增计划预算需为10至240分钟')
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 7)
    throw new Error('每周安排1至7天')
  if (!['balanced', 'weakness', 'sprint'].includes(input.mode))
    throw new Error('请选择有效策略')
}
export function diagnose(input: PilotInput): Diagnosis[] {
  const subjects = new Map<
    string,
    { errors: number; minutes: number; reasons: Map<string, number> }
  >()
  const get = (name: string) => {
    const key = name.trim().slice(0, 80) || '综合练习'
    if (!subjects.has(key))
      subjects.set(key, { errors: 0, minutes: 0, reasons: new Map() })
    return subjects.get(key)!
  }
  for (const row of input.sessions.filter(
    (row) =>
      row.date >= addDays(input.startDate, -30) && row.date <= input.startDate,
  ))
    get(row.subject).minutes += row.duration
  for (const row of input.wrongQuestions.filter((row) => !row.mastered)) {
    const target = get(row.subject)
    target.errors++
    target.reasons.set(
      row.whyWrong,
      (target.reasons.get(row.whyWrong) ?? 0) + 1,
    )
  }
  return [...subjects]
    .map(([subject, row]) => ({
      subject,
      errors: row.errors,
      minutes: row.minutes,
      reason:
        [...row.reasons].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        '暂无错题证据，先做基线练习',
    }))
    .sort((a, b) => b.errors - a.errors || a.minutes - b.minutes)
    .slice(0, 6)
}
export function buildPlan(input: PilotInput): PilotPlan {
  validInput(input)
  const diagnosis = diagnose(input)
  const targets =
    input.mode === 'weakness' && diagnosis.some((row) => row.errors > 0)
      ? diagnosis.filter((row) => row.errors > 0).slice(0, 2)
      : diagnosis
  const subjects = targets.length
    ? targets.map((row) => row.subject)
    : ['资料分析', '判断推理', '言语理解与表达']
  const tasks: PlanTask[] = []
  for (let day = 0; day < input.days; day++) {
    const date = addDays(input.startDate, Math.floor((day * 7) / input.days))
    const subject =
      input.mode === 'sprint' && input.days > 2 && day === input.days - 1
        ? '综合模拟'
        : subjects[day % subjects.length]
    const reason = diagnosis.find((row) => row.subject === subject)
    const practice = Math.ceil(input.minutes * 0.65),
      review = input.minutes - practice
    const drills =
      input.mode === 'sprint'
        ? '限时模拟与错因复盘'
        : input.mode === 'weakness'
          ? '薄弱考点专项练习'
          : '方法整理与专项练习'
    for (const [kind, minutes, title] of [
      ['practice', practice, drills],
      ['review', review, '错题重做与方法回忆'],
    ] as const) {
      tasks.push({
        id: `pilot:${date}:${kind}:${subject}`,
        date,
        subject,
        title: `${subject} · ${title}（${minutes}分钟）`,
        done: false,
        createdAt: Date.now(),
        minutes,
        kind,
        reason: reason?.errors
          ? `${reason.errors}条未掌握错题，主要错因：${reason.reason}`
          : '缺少足够错题证据，先建立练习基线',
      })
    }
  }
  return {
    startDate: input.startDate,
    mode: input.mode,
    budget: input.minutes,
    days: input.days,
    diagnosis,
    tasks,
    evidence: [
      `读取${input.sessions.length}条学习记录`,
      `${input.wrongQuestions.filter((row) => !row.mastered).length}条未掌握错题`,
      `仅约束本次新增计划的每日分钟数；现有任务未记录时长，不推断其负荷`,
      '复习建议不等于已完成的间隔复习历史',
    ],
  }
}
export function mergePlanTasks(existing: DailyTask[], proposed: PlanTask[]) {
  const ids = new Set(existing.map((row) => row.id)),
    added: DailyTask[] = []
  for (const row of proposed) {
    if (ids.has(row.id)) continue
    ids.add(row.id)
    const { minutes: _minutes, reason: _reason, kind: _kind, ...task } = row
    void _minutes
    void _reason
    void _kind
    added.push(task)
  }
  if (existing.length + added.length > 20000)
    throw new Error('任务数量已达本地上限，请先整理任务')
  return { tasks: [...added, ...existing], added: added.length }
}
export async function runPilot(
  input: PilotInput,
  onEvent: (event: PilotEvent) => void,
  signal: AbortSignal,
): Promise<PilotPlan> {
  const emit = async (tool: string, label: string, operation: () => string) => {
    if (signal.aborted) throw new DOMException('已取消', 'AbortError')
    onEvent({ tool, label, status: 'running', detail: '正在执行' })
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (signal.aborted) throw new DOMException('已取消', 'AbortError')
    const detail = operation()
    onEvent({ tool, label, status: 'done', detail })
  }
  await emit('read_profile', '读取学习证据', () => {
    validInput(input)
    return `${input.sessions.length}条学习记录，${input.wrongQuestions.length}条错题，仅在本机处理`
  })
  let diagnosis: Diagnosis[] = []
  await emit('diagnose_weakness', '诊断与选择技能', () => {
    diagnosis = diagnose(input)
    return diagnosis.length
      ? `优先关注${diagnosis
          .slice(0, 2)
          .map((row) => row.subject)
          .join('、')}`
      : '数据较少，选择基础练习路径'
  })
  let plan: PilotPlan | undefined
  await emit('schedule_week', '编排七日计划', () => {
    plan = buildPlan(input)
    return `${input.days}个学习日，${plan.tasks.length}项任务`
  })
  await emit('validate_budget', '检查时间与重复规则', () => {
    const days = new Map<string, number>()
    for (const task of plan!.tasks)
      days.set(task.date, (days.get(task.date) ?? 0) + task.minutes)
    if ([...days.values()].some((minutes) => minutes > input.minutes))
      throw new Error('计划超出预算')
    return `每天新增任务不超过${input.minutes}分钟，等待你确认写入`
  })
  return plan!
}
export function calendarText(tasks: PlanTask[]) {
  const escape = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudyPilot//LocalPlan//ZH',
    'CALSCALE:GREGORIAN',
    ...tasks.flatMap((task) => [
      'BEGIN:VEVENT',
      `UID:${encodeURIComponent(task.id)}@study-pilot.local`,
      `DTSTAMP:${task.date.replaceAll('-', '')}T000000Z`,
      `DTSTART;VALUE=DATE:${task.date.replaceAll('-', '')}`,
      `DTEND;VALUE=DATE:${addDays(task.date, 1).replaceAll('-', '')}`,
      `SUMMARY:${escape(task.title)}`,
      `DESCRIPTION:${escape(task.reason)}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
    '',
  ]
    .map(foldCalendarLine)
    .join('\r\n')
}

function foldCalendarLine(line: string) {
  const encoder = new TextEncoder()
  let result = '',
    width = 0
  for (const character of line) {
    const length = encoder.encode(character).length
    if (width + length > 75) {
      result += '\r\n '
      width = 1
    }
    result += character
    width += length
  }
  return result
}
