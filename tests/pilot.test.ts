import { afterEach, expect, it, vi } from 'vitest'
import {
  buildPlan,
  calendarText,
  diagnose,
  mergePlanTasks,
  runPilot,
  type PilotInput,
} from '../src/lib/study-pilot'
import { createBackup, emptyDataset, parseBackup } from '../src/lib/backup'

const input: PilotInput = {
  startDate: '2026-10-25',
  minutes: 65,
  days: 5,
  mode: 'balanced',
  sessions: [],
  wrongQuestions: [],
}
afterEach(() => vi.unstubAllGlobals())
it('stays inside every daily budget, uses real calendar dates and does not create records while planning', () => {
  const plan = buildPlan(input)
  expect(plan.tasks).toHaveLength(10)
  const totals = new Map<string, number>()
  for (const row of plan.tasks)
    totals.set(row.date, (totals.get(row.date) ?? 0) + row.minutes)
  expect([...totals.values()]).toEqual([65, 65, 65, 65, 65])
  expect([...totals.keys()]).toEqual([
    '2026-10-25',
    '2026-10-26',
    '2026-10-27',
    '2026-10-29',
    '2026-10-30',
  ])
  expect(input.sessions).toEqual([])
  expect(plan.diagnosis).toEqual([])
  expect(plan.tasks[0].reason).toContain('缺少')
})
it('bases weakness mode on unmastered errors and excludes future and stale study time', () => {
  const evidence: PilotInput = {
    ...input,
    mode: 'weakness',
    wrongQuestions: [
      { id: 'w1', subject: '资料分析', whyWrong: '计算错误', createdAt: 1 },
      {
        id: 'w2',
        subject: '判断推理',
        whyWrong: '审题失误',
        createdAt: 1,
        mastered: true,
      },
    ],
    sessions: [
      {
        id: 's1',
        date: '2026-10-24',
        subject: '常识判断',
        duration: 30,
        title: 'x',
        status: 'completed',
        createdAt: 1,
      },
      {
        id: 's2',
        date: '2027-01-01',
        subject: '未来',
        duration: 90,
        title: 'x',
        status: 'completed',
        createdAt: 1,
      },
      {
        id: 's3',
        date: '2025-01-01',
        subject: '过期',
        duration: 90,
        title: 'x',
        status: 'completed',
        createdAt: 1,
      },
    ],
  }
  expect(diagnose(evidence).map((row) => row.subject)).toEqual([
    '资料分析',
    '常识判断',
  ])
  expect(new Set(buildPlan(evidence).tasks.map((row) => row.subject))).toEqual(
    new Set(['资料分析']),
  )
  const sprint = buildPlan({ ...input, mode: 'sprint' })
  expect(sprint.tasks.at(-1)?.subject).toBe('综合模拟')
})
it.each([
  { minutes: 0 },
  { minutes: Infinity },
  { minutes: 241 },
  { days: 0 },
  { days: 8 },
  { startDate: '2026-02-31' },
])('rejects unusable plans: %o', (patch) => {
  expect(() => buildPlan({ ...input, ...patch })).toThrow()
})
it('commits a selection idempotently and stays compatible with complete backups', () => {
  const plan = buildPlan(input),
    first = mergePlanTasks([], plan.tasks.slice(0, 2))
  expect(first.added).toBe(2)
  const twice = mergePlanTasks(first.tasks, buildPlan(input).tasks.slice(0, 2))
  expect(twice.added).toBe(0)
  const data = { ...emptyDataset(), dailyTasks: twice.tasks }
  expect(parseBackup(createBackup(data)).dailyTasks).toEqual(first.tasks)
})
it('cancellation stops before subsequent tools and does not fabricate a completed run', async () => {
  const controller = new AbortController(),
    events: string[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    controller.abort()
    callback()
  })
  await expect(
    runPilot(
      input,
      (event) => events.push(event.tool + ':' + event.status),
      controller.signal,
    ),
  ).rejects.toThrow('已取消')
  expect(events).toEqual(['read_profile:running'])
})
it('exports UTF-8 folded calendar data without newline injection', () => {
  const plan = buildPlan(input)
  plan.tasks[0].title = '中文'.repeat(80) + '\rBEGIN:VEVENT\nmalicious;,'
  const text = calendarText(plan.tasks.slice(0, 1))
  expect(
    text
      .split('\r\n')
      .every((line) => new TextEncoder().encode(line).length <= 75),
  ).toBe(true)
  const unfolded = text.replace(/\r\n /g, '')
  expect(unfolded.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1)
  expect(unfolded).toContain('\\nBEGIN:VEVENT\\nmalicious\\;\\,')
  expect(unfolded).toContain('DTEND;VALUE=DATE:20261026')
})
