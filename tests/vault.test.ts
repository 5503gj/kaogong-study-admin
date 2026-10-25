import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { createBackup, emptyDataset, parseBackup } from '../src/lib/backup'
import {
  readDataset,
  writeDataset,
  restoreDataset,
  accountKey,
} from '../src/lib/vault'
import { buildQuestionBank, buildSeed } from '../src/lib/seed'

function sample() {
  const data = emptyDataset()
  data.sessions = [
    {
      id: 's1',
      date: '2026-10-25',
      subject: '政治理论',
      title: 'reference-record',
      duration: 30,
      status: 'completed',
      createdAt: 1,
    },
  ]
  return data
}

describe('backup contract and credential removal', () => {
  it('does not include keys in exported or imported config', () => {
    const data = sample()
    data.aiConfig = {
      ...data.aiConfig,
      enabled: true,
      apiKey: 'synthetic-test-key',
    }
    const exported = createBackup(data)
    expect(JSON.stringify(exported)).not.toContain('synthetic-test-key')
    expect(exported.aiConfig).not.toHaveProperty('apiKey')
    const legacy = {
      ...exported,
      version: 1,
      aiConfig: { ...exported.aiConfig, apiKey: 'old-secret', enabled: true },
    }
    expect(parseBackup(legacy).aiConfig).toMatchObject({
      enabled: false,
      apiKey: '',
    })
  })
  it.each([
    {},
    { version: 999 },
    { ...createBackup(sample()), sessions: 'oops' },
    {
      ...createBackup(sample()),
      sessions: [{ ...sample().sessions[0], date: '2026-02-31' }],
    },
    {
      ...createBackup(sample()),
      sessions: [sample().sessions[0], sample().sessions[0]],
    },
  ])('rejects corrupt/unknown data before replacing storage', (bad) => {
    expect(() => parseBackup(bad)).toThrow()
  })
  it('accepts documented seed and round-trips complete valid data', () => {
    const seed = buildSeed()
    const data = { ...sample(), ...seed, questionBank: buildQuestionBank() }
    expect(parseBackup(createBackup(data)).sessions).toEqual(data.sessions)
  })
})

describe('real IndexedDB transactions', () => {
  it('partitions account records and credentials never persist', async () => {
    const a = sample(),
      b = emptyDataset()
    a.aiConfig.apiKey = 'memory-only-value'
    await writeDataset('account-a', a)
    await writeDataset('account-b', b)
    expect((await readDataset('account-a'))?.sessions[0].title).toBe(
      'reference-record',
    )
    expect((await readDataset('account-b'))?.sessions).toEqual([])
    expect((await readDataset('account-a'))?.aiConfig.apiKey).toBe('')
    expect(accountKey('a:b')).not.toBe(accountKey('a%3Ab'))
  })
  it('restores the complete before-import snapshot', async () => {
    await writeDataset('snapshot-user', sample())
    await writeDataset('snapshot-user', emptyDataset(), true)
    expect((await readDataset('snapshot-user'))?.sessions).toEqual([])
    expect((await restoreDataset('snapshot-user')).sessions[0].id).toBe('s1')
    expect((await readDataset('snapshot-user'))?.sessions[0].id).toBe('s1')
  })
  it('rejects bad imports without altering prior data', async () => {
    const data = sample()
    await writeDataset('reject-user', data)
    const bad = { ...data, sessions: 'bad' } as unknown as typeof data
    await expect(writeDataset('reject-user', bad, true)).rejects.toThrow()
    expect((await readDataset('reject-user'))?.sessions).toEqual(data.sessions)
  })
  it('reports quota failures and keeps the previous committed snapshot', async () => {
    await writeDataset('quota-user', sample())
    const put = vi
      .spyOn(IDBObjectStore.prototype, 'put')
      .mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError')
      })
    try {
      await expect(writeDataset('quota-user', emptyDataset())).rejects.toThrow(
        '保存失败',
      )
    } finally {
      put.mockRestore()
    }
    expect((await readDataset('quota-user'))?.sessions[0].id).toBe('s1')
  })
  it('stores photos as blobs and restores image data for rendering and export', async () => {
    const data = emptyDataset()
    data.wrongQuestions = [
      {
        id: 'photo1',
        subject: '数量关系',
        whyWrong: '计算错误',
        photo: 'data:image/png;base64,aGVsbG8=',
        createdAt: 1,
      },
    ]
    await writeDataset('photo-user', data)
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('study-admin-v2', 1)
      req.onsuccess = () => resolve(req.result)
      req.onerror = reject
    })
    const raw = await new Promise<{ wrongQuestions: { photo: Blob }[] }>(
      (resolve, reject) => {
        const tx = db.transaction('accounts'),
          req = tx.objectStore('accounts').get(accountKey('photo-user'))
        req.onsuccess = () => resolve(req.result)
        req.onerror = reject
        tx.oncomplete = () => db.close()
      },
    )
    expect(raw.wrongQuestions[0].photo).toBeInstanceOf(Blob)
    expect((await readDataset('photo-user'))?.wrongQuestions[0].photo).toBe(
      data.wrongQuestions[0].photo,
    )
  })
})
