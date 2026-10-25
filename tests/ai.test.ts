import { afterEach, describe, expect, it, vi } from 'vitest'
import { callLLM, localAnswer, testConnection } from '../src/lib/ai'
import type { QuestionBankItem } from '../src/types'

const bank: QuestionBankItem[] = [
  {
    id: 'q1',
    subject: '数量关系',
    module: '行程',
    type: '计算',
    question:
      '甲乙两辆汽车从同一地点同时出发，甲每小时行驶60千米，乙每小时行驶40千米，2小时相距多少千米？',
    answer: '40千米',
    analysis: '(60-40)*2=40',
    createdAt: 1,
  },
]
const config = {
  enabled: true,
  endpoint: 'https://example.invalid/chat',
  apiKey: 'test-only',
  model: 'mock',
}
afterEach(() => vi.unstubAllGlobals())
describe('answer correctness', () => {
  it('does not reuse a reference answer after a numeric change', () => {
    expect(
      localAnswer(bank[0].question.replace('2小时', '3小时'), { bank }),
    ).not.toContain('正确作答：40千米')
  })
  it('matches the exact complete question', () => {
    expect(localAnswer(bank[0].question, { bank })).toContain('40千米')
  })
  it('uses a dated official source for 2026 eligibility', () => {
    const result = localAnswer('2026年国考报考年龄要求是什么？')
    expect(result).toContain('38')
    expect(result).toContain('43')
    expect(result).toContain('https://')
    expect(result).not.toContain('18-35')
  })
})
describe('provider contract', () => {
  it('does not treat an empty 200 response as a working model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
    expect((await testConnection(config)).ok).toBe(false)
  })
  it('bounds output and supplies a cancellable signal', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'ok' } }] }),
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    await callLLM(config, [{ role: 'user', content: 'hello' }])
    const [, options] = fetchMock.mock.calls[0]
    expect(options.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(options.body).max_tokens).toBeGreaterThan(0)
  })
})
