import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createBackup, emptyDataset, parseBackup, type Dataset } from './backup'
import { readDataset, writeDataset, restoreDataset } from './vault'
import { buildSeed, buildQuestionBank } from './seed'
import { loadJSON } from './storage'

type Update<T> = T | ((previous: T) => T)
function legacyData(): Dataset | null {
  if (
    ![
      'sessions',
      'todos',
      'dailyTasks',
      'focusSessions',
      'questionBank',
      'wrongQuestions',
    ].some((key) => localStorage.getItem('study-admin:' + key))
  )
    return null
  const data = emptyDataset()
  for (const key of [
    'sessions',
    'todos',
    'dailyTasks',
    'focusSessions',
    'goal',
    'questionBank',
    'wrongQuestions',
  ] as const) {
    const raw = localStorage.getItem('study-admin:' + key)
    if (raw !== null) Object.assign(data, { [key]: JSON.parse(raw) })
  }
  return parseBackup(createBackup(data))
}
export function useDataset(user: string | null) {
  const [data, setData] = useState<Dataset>(emptyDataset)
  const [ready, setReady] = useState(!user)
  const [saveState, setSaveState] = useState('读取中')
  const current = useRef(data),
    queue = useRef(Promise.resolve()),
    revision = useRef(0),
    mounted = useRef(true),
    failed = useRef(false),
    locked = useRef(false),
    pendingCount = useRef(0)
  useEffect(() => {
    mounted.current = true
    if (!user)
      return () => {
        mounted.current = false
      }
    let active = true
    ;(async () => {
      // Old credentials must not survive in legacy localStorage after upgrading.
      localStorage.removeItem('study-admin:aiConfig')
      let next = await readDataset(user)
      // A cancelled/StrictMode initialization must not seed or claim legacy data.
      if (!active) return
      if (!next) {
        const legacy = legacyData()
        const owner = loadJSON<string | null>('study-admin:legacy-owner', null)
        if (
          legacy &&
          (!owner || owner === user) &&
          window.confirm(
            '旧版所有账号共用同一套数据，无法自动确定归属。是否将它迁移至当前本地空间 ' +
              user +
              '？',
          )
        ) {
          localStorage.setItem('study-admin:legacy-owner', user)
          next = legacy
        } else {
          const seed = user === 'admin' ? buildSeed() : null
          next = {
            ...emptyDataset(),
            ...(seed
              ? {
                  sessions: seed.sessions,
                  todos: seed.todos,
                  dailyTasks: seed.dailyTasks,
                  wrongQuestions: seed.wrongQuestions,
                }
              : {}),
            questionBank: buildQuestionBank(),
          }
        }
        await writeDataset(user, next)
      }
      if (active) {
        current.current = next
        setData(next)
        setReady(true)
        setSaveState('已保存到当前本地空间')
      }
    })().catch(() => {
      if (active)
        setSaveState(
          '读取本地数据库失败；请保留旧数据和备份，关闭其他旧页面后重试。',
        )
    })
    return () => {
      active = false
      mounted.current = false
    }
  }, [user])
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (failed.current || pendingCount.current > 0) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [])
  const setField = useCallback(
    <K extends keyof Dataset>(key: K, value: Update<Dataset[K]>) => {
      if (locked.current) {
        toast.error('正在恢复数据，请稍后操作')
        return
      }
      const nextValue =
        typeof value === 'function'
          ? (value as (v: Dataset[K]) => Dataset[K])(current.current[key])
          : value
      const next = { ...current.current, [key]: nextValue }
      current.current = next
      setData(next)
      if (!user) return
      const rev = ++revision.current
      pendingCount.current++
      setSaveState('保存中…')
      queue.current = queue.current
        .catch(() => {})
        .then(() => writeDataset(user, next))
        .then(() => {
          if (rev === revision.current) {
            failed.current = false
            if (mounted.current) setSaveState('已保存到当前本地空间')
          }
        })
        .catch(() => {
          failed.current = true
          if (mounted.current && rev === revision.current) {
            setSaveState('保存失败：当前更改尚未保存，请导出备份后重试。')
            toast.error('本地空间不足或保存失败，当前更改尚未保存')
          }
        })
        .finally(() => {
          pendingCount.current--
        })
    },
    [user],
  )
  const replace = async (next: Dataset) => {
    if (!user) throw new Error('请先选择本地空间')
    if (locked.current) throw new Error('正在导入或恢复，请稍后重试')
    locked.current = true
    try {
      await queue.current
      if (failed.current)
        throw new Error('存在未保存的更改，请先导出备份或重试保存')
      await writeDataset(user, next, true)
      revision.current++
      current.current = next
      setData(next)
      setSaveState('已保存到当前本地空间')
    } finally {
      locked.current = false
    }
  }
  const restore = async () => {
    if (!user) throw new Error('请先选择本地空间')
    if (locked.current) throw new Error('正在导入或恢复，请稍后重试')
    locked.current = true
    try {
      await queue.current
      if (failed.current) throw new Error('存在未保存更改，请先备份')
      const next = await restoreDataset(user)
      revision.current++
      current.current = next
      setData(next)
      setSaveState('已恢复导入前快照')
      return next
    } finally {
      locked.current = false
    }
  }
  const transact = async (update: (previous: Dataset) => Dataset) => {
    if (!user) throw new Error('请先选择本地空间')
    if (locked.current) throw new Error('数据正在更新，请稍后重试')
    locked.current = true
    let writing = false
    try {
      await queue.current
      if (failed.current)
        throw new Error('存在未保存更改，请先导出备份或重试保存')
      const next = update(current.current)
      pendingCount.current++
      writing = true
      setSaveState('保存中…')
      await writeDataset(user, next)
      revision.current++
      current.current = next
      if (mounted.current) {
        setData(next)
        setSaveState('已保存到当前本地空间')
      }
    } catch (error) {
      if (writing && mounted.current)
        setSaveState('写入失败，本次操作未修改已保存数据')
      throw error
    } finally {
      if (writing) pendingCount.current--
      locked.current = false
    }
  }
  return {
    data,
    ready,
    saveState,
    setField,
    replace,
    restore,
    transact,
    hasUnsaved: saveState === '保存中…' || saveState.startsWith('保存失败'),
  }
}
