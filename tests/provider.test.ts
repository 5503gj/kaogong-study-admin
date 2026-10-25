import { afterEach, expect, it, vi } from 'vitest'
import { callLLM, localAnswer } from '../src/lib/ai'
const config = {
  enabled: true,
  endpoint: 'https://example.invalid/chat',
  apiKey: 'synthetic',
  model: 'mock',
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
function reply() {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: 'valid answer' } }] }),
  )
}
it('does not extrapolate 2026 rules to other years or provinces', () => {
  expect(localAnswer('2027年国考年龄要求')).toContain('未收录')
  expect(localAnswer('2026年江苏省考年龄要求')).toContain('具体省份')
})
it('requires explicit permission to attach a learning profile', async () => {
  const fetch = vi.fn().mockImplementation(async () => reply())
  vi.stubGlobal('fetch', fetch)
  await callLLM(
    config,
    [{ role: 'user', content: 'hi' }],
    'private-learning-plan',
  )
  expect(fetch.mock.calls[0][1].body).not.toContain('private-learning-plan')
  await callLLM(
    { ...config, shareProfile: true },
    [{ role: 'user', content: 'hi' }],
    'private-learning-plan',
  )
  expect(fetch.mock.calls[1][1].body).toContain('private-learning-plan')
})
it('rejects missing text, errors and excessive replies', async () => {
  for (const response of [
    new Response('{}'),
    new Response('fail', { status: 429 }),
    new Response(
      JSON.stringify({ choices: [{ message: { content: 'x'.repeat(9000) } }] }),
    ),
  ]) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    await expect(
      callLLM(config, [{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow()
  }
})
it('propagates caller cancellation and limits the prompt', async () => {
  const controller = new AbortController()
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('cancel', 'AbortError')),
          )
        }),
    ),
  )
  const pending = callLLM(
    config,
    [{ role: 'user', content: 'hi' }],
    undefined,
    controller.signal,
  )
  const assertion = expect(pending).rejects.toThrow()
  controller.abort()
  await assertion
  const fetch = vi.fn().mockImplementation(async () => reply())
  vi.stubGlobal('fetch', fetch)
  await callLLM(
    config,
    Array.from({ length: 100 }, () => ({
      role: 'user' as const,
      content: 'a'.repeat(9000),
    })),
  )
  const body = JSON.parse(fetch.mock.calls[0][1].body)
  expect(
    body.messages
      .slice(1)
      .reduce(
        (sum: number, m: { content: string }) => sum + m.content.length,
        0,
      ),
  ).toBeLessThanOrEqual(16000)
})

it('asks to disambiguate mixed scopes and does not answer education queries with age rules', () => {
  expect(localAnswer('2026和2027国考年龄要求')).toContain('请明确')
  expect(localAnswer('2026国考和江苏省考年龄相同吗')).toContain('请明确')
  expect(localAnswer('2026国考学历要求')).not.toContain('38周岁')
  expect(localAnswer('2026国考学历要求')).toContain('职位表')
  expect(localAnswer('国考考什么科目')).toContain('请明确')
})
