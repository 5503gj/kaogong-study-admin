import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

function commonJS<T>(path: string, globals: Record<string, unknown> = {}): T {
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    module,
    Date,
    ...globals,
  })
  return module.exports as T
}

it('counts local early-morning activity on its actual calendar day', () => {
  vi.stubEnv('TZ', 'Asia/Shanghai')
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-24T16:30:00Z'))
  const { computeStats } = commonJS<{
    computeStats: (
      rows: object[],
      todos: object[],
      goal: object,
    ) => { todayMinutes: number; trend: { date: string }[] }
  }>('../miniprogram-scaffold/utils/stats.js')
  const stats = computeStats(
    [{ date: '2026-10-25', duration: 30, subject: '资料分析' }],
    [],
    { dailyMinutes: 60 },
  )
  expect(stats.todayMinutes).toBe(30)
  expect(stats.trend.at(-1)?.date).toBe('2026-10-25')
})

it('surfaces WeChat write failures instead of returning fake success', () => {
  const store = commonJS<{ setGoal: (goal: object) => void }>(
    '../miniprogram-scaffold/utils/store.js',
    {
      wx: {
        setStorageSync: () => {
          throw new Error('quota')
        },
      },
    },
  )
  expect(() => store.setGoal({ dailyMinutes: 60, weeklyDays: 5 })).toThrow(
    '本地保存失败',
  )
})
