import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function route(page: Page, name: string) {
  await page.evaluate((name) => {
    location.hash = '/' + name
  }, name)
}
async function ready(page: Page) {
  await expect(
    page.getByRole('status').filter({ hasText: /本地空间：.*已(保存|恢复)/ }),
  ).toBeVisible()
}
async function register(page: Page, user: string) {
  await page.getByRole('button', { name: '没有账号？去注册' }).click()
  await page.locator('#username').fill(user)
  await page.locator('#password').fill('synthetic-test-password')
  await page.getByRole('button', { name: '注册并登录', exact: true }).click()
  await ready(page)
}
async function logout(page: Page) {
  await ready(page)
  await page.getByRole('button', { name: '账号', exact: true }).click()
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  await expect(page.locator('#username')).toBeVisible()
}
async function addRecord(page: Page, title: string, saved = true) {
  await route(page, 'records')
  await page.getByRole('button', { name: '新增记录' }).click()
  await page.locator('#r-subject').fill('资料分析')
  await page.locator('#r-title').fill(title)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '保存', exact: true })
    .click()
  if (saved) await ready(page)
  await expect(page.getByText(title, { exact: true })).toBeVisible()
}
async function backup(page: Page) {
  await route(page, 'settings')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出备份' }).click()
  const download = await downloading
  return JSON.parse(await readFile((await download.path())!, 'utf8'))
}

test('accounts isolate records; secrets never persist; imports validate and restore atomically', async ({
  page,
}) => {
  page.on('dialog', (dialog) => dialog.accept())
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('provider.invalid')) requests.push(request.url())
  })
  await page.goto('/')
  await register(page, 'person_a')
  await addRecord(page, 'A-only record')
  await route(page, 'settings')
  await page.locator('#key').fill('sk-synthetic-do-not-store')
  await page.locator('#ep').fill('https://provider.invalid/v1/chat/completions')
  await page.getByRole('button', { name: '保存 AI 配置' }).click()
  await ready(page)
  const exported = await backup(page)
  expect(exported.aiConfig).not.toHaveProperty('apiKey')
  expect(JSON.stringify(exported)).not.toContain('sk-synthetic-do-not-store')
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('study-admin-v2', 1)
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    const rows = await new Promise((resolve, reject) => {
      const r = db.transaction('accounts').objectStore('accounts').getAll()
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    db.close()
    return JSON.stringify(rows) + JSON.stringify(localStorage)
  })
  expect(stored).not.toContain('sk-synthetic-do-not-store')
  await page.reload()
  await ready(page)
  await expect(page.locator('#key')).toHaveValue('')
  expect(requests).toEqual([])

  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  })
  await expect(
    page.getByText(/备份结构、版本或字段不合法/).first(),
  ).toBeVisible()
  expect(
    (await backup(page)).sessions.map((row: { title: string }) => row.title),
  ).toEqual(['A-only record'])

  const imported = {
    ...exported,
    sessions: exported.sessions.map((row: object) => ({
      ...row,
      title: 'imported record',
    })),
  }
  await page.locator('input[type=file]').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)),
  })
  await expect(
    page.getByText('已校验并完整导入，可恢复导入前快照'),
  ).toBeVisible()
  expect((await backup(page)).sessions[0].title).toBe('imported record')
  await page.getByRole('button', { name: '恢复最近导入或清空前的快照' }).click()
  await expect(
    page.getByText('已恢复导入前快照', { exact: true }),
  ).toBeVisible()
  expect((await backup(page)).sessions[0].title).toBe('A-only record')

  await logout(page)
  await register(page, 'person_b')
  await route(page, 'records')
  await expect(page.getByText('A-only record', { exact: true })).toHaveCount(0)
  await addRecord(page, 'B-only record')
  await logout(page)
  await page.locator('#username').fill('person_a')
  await page.locator('#password').fill('synthetic-test-password')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await ready(page)
  await route(page, 'records')
  await expect(page.getByText('A-only record', { exact: true })).toBeVisible()
  await expect(page.getByText('B-only record', { exact: true })).toHaveCount(0)
  await route(page, 'settings')
  await page.getByRole('button', { name: '清空所有数据', exact: true }).click()
  await expect(page.getByText(/已清空当前空间，刷新不会重建/)).toBeVisible()
  await page.reload()
  await ready(page)
  expect((await backup(page)).sessions).toEqual([])
  await page.getByRole('button', { name: '恢复最近导入或清空前的快照' }).click()
  await expect(
    page.getByText('已恢复导入前快照', { exact: true }),
  ).toBeVisible()
  expect((await backup(page)).sessions[0].title).toBe('A-only record')
  expect(errors).toEqual([])
})

test('quota failure stays visible and exportable; later successful save recovers complete memory state', async ({
  page,
}) => {
  await page.goto('/')
  await register(page, 'quota_user')
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    Object.assign(window, {
      restorePut: () => {
        IDBObjectStore.prototype.put = original
      },
    })
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('test quota', 'QuotaExceededError')
    }
  })
  await addRecord(page, 'unsaved but exportable', false)
  await expect(
    page.getByRole('status').filter({ hasText: /保存失败：当前更改尚未保存/ }),
  ).toBeVisible()
  expect((await backup(page)).sessions[0].title).toBe('unsaved but exportable')
  await page.evaluate(() =>
    (window as Window & { restorePut: () => void }).restorePut(),
  )
  await page.locator('#daily').fill('90')
  await page.getByRole('button', { name: '保存目标' }).click()
  await ready(page)
  await page.reload()
  await ready(page)
  expect((await backup(page)).sessions[0].title).toBe('unsaved but exportable')
})

test('photos decode, compress and survive reload as JPEG; stale AI replies cannot reappear after reset', async ({
  page,
}) => {
  await page.goto('/')
  await register(page, 'photo_user')
  await route(page, 'questions')
  await page.getByRole('button', { name: '拍照记录错题' }).click()
  // A real browser-generated 1800px image exercises decoding and downscaling.
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1800
    canvas.height = 1000
    const context = canvas.getContext('2d')!
    context.fillStyle = '#336699'
    context.fillRect(0, 0, 1800, 1000)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const modal = page.getByRole('dialog')
  await modal.locator('input[type=file]').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  })
  await expect(modal.getByAltText('错题')).toHaveAttribute(
    'src',
    /^data:image\/jpeg/,
  )
  await modal
    .getByPlaceholder('把题干 / 题目抄下来，或让照片替你记录')
    .fill('photo roundtrip question')
  await modal.getByRole('button', { name: '保存错题' }).click()
  await ready(page)
  await route(page, 'wrong-analysis')
  await page.reload()
  await ready(page)
  const photo = page.getByAltText('错题')
  await expect(photo).toHaveAttribute('src', /^data:image\/jpeg/)
  expect(
    await photo.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBe(1280)
  await route(page, 'settings')
  await page.locator('#ep').fill('https://provider.invalid/v1/chat/completions')
  await page.locator('#key').fill('sk-synthetic-memory-only')
  await page.getByRole('button', { name: '已关闭', exact: true }).click()
  await page.getByRole('button', { name: '保存 AI 配置' }).click()
  await ready(page)
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('https://provider.invalid/**', async (route) => {
    await gate
    await route
      .fulfill({
        json: {
          choices: [{ message: { content: 'LATE_STALE_MODEL_ANSWER' } }],
        },
      })
      .catch(() => {})
  })
  await route(page, 'ai')
  const request = page.waitForRequest('https://provider.invalid/**')
  await page
    .getByPlaceholder('问我考公问题，或把一道真题题干发给我…')
    .fill('synthetic provider question')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await request
  const aborted = page.waitForEvent('requestfailed', (request) =>
    request.url().includes('provider.invalid'),
  )
  await page.getByRole('button', { name: '重置对话' }).click()
  await aborted
  release()
  await expect(
    page.getByText('synthetic provider question', { exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByText('LATE_STALE_MODEL_ANSWER', { exact: true }),
  ).toHaveCount(0)
})

test('login loads no dashboard or chart bundle', async ({ page }) => {
  const scripts: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url())
  })
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: '登录', exact: true }),
  ).toBeVisible()
  expect(scripts.some((url) => /\/(chart|Dashboard)-/.test(url))).toBe(false)
})

test('failed local session write does not pretend to log out or crash', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await register(page, 'session_user')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Object.assign(window, {
      restoreStorage: () => {
        Storage.prototype.setItem = original
      },
    })
    Storage.prototype.setItem = function (key, value) {
      if (key === 'study-admin:session')
        throw new DOMException('test quota', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '账号', exact: true }).click()
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  await expect(page.getByText(/退出失败：浏览器无法保存会话状态/)).toBeVisible()
  await expect(
    page.getByRole('status').filter({ hasText: /本地空间：session_user/ }),
  ).toBeVisible()
  expect(errors).toEqual([])
  await page.evaluate(() =>
    (window as Window & { restoreStorage: () => void }).restoreStorage(),
  )
  await logout(page)
})
