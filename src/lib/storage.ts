// 本地持久化工具：基于 localStorage，无需后端即可运行
import { useEffect, useState } from "react"

/** 读取 JSON，失败或不存在时返回 fallback */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 写入 JSON */
export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error("saveJSON 失败:", e)
  }
}

/**
 * 与 localStorage 双向绑定的 state。
 * 用法和 useState 一致，但数据会自动持久化。
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => loadJSON(key, initial))
  useEffect(() => {
    saveJSON(key, state)
  }, [key, state])
  return [state, setState] as const
}

/** 生成简单唯一 id（本地应用足够用） */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
