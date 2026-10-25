import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function tasks(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('study-admin-v2', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const data = await new Promise<{
      dailyTasks: { id: string; title: string }[]
    }>((resolve, reject) => {
      const request = db
        .transaction('accounts')
        .objectStore('accounts')
        .get('user:pilot_user')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return data.dailyTasks
  })
}
async function signIn(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '没有账号？去注册' }).click()
  await page.locator('#username').fill('pilot_user')
  await page.locator('#password').fill('synthetic-pilot-test')
  await page.getByRole('button', { name: '注册并登录' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: /本地空间：.*已保存/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '把下一步，安排明白。' }),
  ).toBeVisible()
}

test('preview is read-only, selected tasks commit atomically, repeat runs are idempotent, calendar is downloadable', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await signIn(page)
  await page.locator('#pilot-days').selectOption('3')
  await page.getByRole('button', { name: '生成我的七日计划' }).click()
  const confirm = page.getByRole('button', { name: '确认加入每日任务' })
  await expect(confirm).toBeEnabled()
  expect(await tasks(page)).toHaveLength(0)
  await expect(page.locator('.tool-node.done')).toHaveCount(4)
  await expect(page.locator('.plan-task')).toHaveCount(6)
  await page.locator('.plan-task input').first().uncheck()
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    Object.assign(window, {
      restorePut: () => {
        IDBObjectStore.prototype.put = put
      },
    })
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('test quota', 'QuotaExceededError')
    }
  })
  await confirm.click()
  await expect(page.getByText(/本地保存失败/).first()).toBeVisible()
  expect(await tasks(page)).toHaveLength(0)
  await expect(page.getByText(/本次已保存/)).toHaveCount(0)
  await page.evaluate(() =>
    (window as Window & { restorePut: () => void }).restorePut(),
  )
  await confirm.click()
  await expect(page.getByText(/本次已保存 5 项/)).toBeVisible()
  expect(await tasks(page)).toHaveLength(5)
  await page.getByRole('button', { name: '生成我的七日计划' }).click()
  await expect(confirm).toBeEnabled()
  await expect(page.locator('.plan-task input:not(:disabled)')).toHaveCount(1)
  await confirm.click()
  await expect(page.getByText(/本次已保存 1 项/)).toBeVisible()
  expect(await tasks(page)).toHaveLength(6)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出日历' }).click()
  const file = await downloading,
    text = await readFile((await file.path())!, 'utf8')
  expect(text.match(/^BEGIN:VEVENT$/gm)).toHaveLength(6)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: '把下一步，安排明白。' }),
  ).toBeVisible()
  expect(await tasks(page)).toHaveLength(6)
  await page.locator('#pilot-days').selectOption('3')
  await page.getByRole('button', { name: '生成我的七日计划' }).click()
  await expect(confirm).toBeDisabled()
  expect(errors).toEqual([])
})

test('keyboard navigation, both themes, mobile layout and reduced motion remain usable', async ({
  page,
}) => {
  await signIn(page)
  await page.keyboard.press('Control+k')
  await page.getByRole('dialog').getByRole('combobox').fill('专注')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/focus$/)
  await page.evaluate(() => (location.hash = '/pilot'))
  await page.getByRole('button', { name: '生成我的七日计划' }).click()
  await expect(
    page.getByRole('button', { name: '确认加入每日任务' }),
  ).toBeEnabled()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false)
    await expect(
      page.getByRole('button', { name: '确认加入每日任务' }),
    ).toBeVisible()
    await page.getByRole('button', { name: '切换主题' }).click()
    expect(
      await page
        .locator('.plan-result')
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe('none')
  }
})
