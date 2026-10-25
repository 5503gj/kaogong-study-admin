import { createBackup, parseBackup, safeAI, type Dataset } from './backup'
import type { WrongQuestion } from '@/types'

const DB = 'study-admin-v2'
const STORE = 'accounts'
type Stored = Omit<Dataset, 'wrongQuestions'> & {
  wrongQuestions: (Omit<WrongQuestion, 'photo'> & { photo?: Blob | string })[]
}
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(new Error('无法打开本地数据库'))
    request.onblocked = () =>
      reject(new Error('本地数据库被其他页面占用，请关闭旧页面'))
  })
}
export function accountKey(user: string) {
  return 'user:' + encodeURIComponent(user)
}
function blobFromDataURL(value: string): Blob {
  const match =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value)
  if (!match || value.length > 2_000_000) throw new Error('照片格式或大小无效')
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: match[1] })
}
async function dataURLFromBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return 'data:' + blob.type + ';base64,' + btoa(binary)
}
async function decode(stored: Stored): Promise<Dataset> {
  const wrongQuestions = await Promise.all(
    stored.wrongQuestions.map(async (row) => ({
      ...row,
      photo:
        row.photo instanceof Blob
          ? await dataURLFromBlob(row.photo)
          : row.photo,
    })),
  )
  return parseBackup({
    ...stored,
    wrongQuestions,
    version: 2,
    exportedAt: new Date().toISOString(),
  })
}
export async function readDataset(user: string): Promise<Dataset | null> {
  const db = await openDB()
  const raw = await new Promise<Stored | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly'),
      req = tx.objectStore(STORE).get(accountKey(user))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error('读取失败'))
    tx.oncomplete = () => db.close()
    tx.onabort = () => {
      db.close()
      reject(new Error('读取失败'))
    }
  })
  return raw ? decode(raw) : null
}
export async function writeDataset(
  user: string,
  data: Dataset,
  snapshot = false,
): Promise<void> {
  // Validate the complete object before opening a write transaction.
  const checked = parseBackup(createBackup(data))
  const stored: Stored = {
    ...checked,
    aiConfig: safeAI(checked.aiConfig),
    wrongQuestions: checked.wrongQuestions.map((row) => ({
      ...row,
      photo: row.photo ? blobFromDataURL(row.photo) : undefined,
    })),
  }
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'),
      store = tx.objectStore(STORE),
      key = accountKey(user)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = tx.onabort = () => {
      db.close()
      reject(
        new Error('本地保存失败（可能空间不足）；当前更改尚未保存，请导出备份'),
      )
    }
    try {
      if (snapshot) {
        const old = store.get(key)
        old.onsuccess = () => {
          try {
            if (old.result) store.put(old.result, 'rollback:' + key)
          } catch {
            tx.abort()
          }
        }
      }
      store.put(stored, key)
    } catch {
      tx.abort()
    }
  })
}
export async function restoreDataset(user: string): Promise<Dataset> {
  const db = await openDB()
  const raw = await new Promise<Stored>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'),
      store = tx.objectStore(STORE),
      key = accountKey(user)
    let value: Stored | undefined
    const req = store.get('rollback:' + key)
    req.onsuccess = () => {
      value = req.result
      if (!value) {
        tx.abort()
        return
      }
      try {
        store.put(value, key)
      } catch {
        tx.abort()
      }
    }
    tx.oncomplete = () => {
      db.close()
      resolve(value!)
    }
    tx.onabort = tx.onerror = () => {
      db.close()
      reject(new Error('没有可恢复的导入前快照'))
    }
  })
  return decode(raw)
}
