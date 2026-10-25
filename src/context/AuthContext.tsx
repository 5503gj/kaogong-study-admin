// 鉴权 Context：基于 localStorage 的本地账号系统（含默认演示账号）
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { sha256 } from '@/lib/hash'
import { loadJSON, saveJSON } from '@/lib/storage'

type UsersMap = Record<string, string> // username -> 密码哈希

interface Session {
  username: string
  loginAt: number
}

const USERS_KEY = 'study-admin:users'
const SESSION_KEY = 'study-admin:session'

import { AuthContext } from './auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(() => {
    const s = loadJSON<Session | null>(SESSION_KEY, null)
    return s?.username ?? null
  })

  // 首次启动写入默认演示账号：admin / 123456
  useEffect(() => {
    const users = loadJSON<UsersMap>(USERS_KEY, {})
    if (Object.keys(users).length === 0) {
      sha256('123456')
        .then((h) => {
          const latest = loadJSON<UsersMap>(USERS_KEY, {})
          if (!latest.admin) saveJSON(USERS_KEY, { ...latest, admin: h })
        })
        .catch(() => toast.error('本地账号存储初始化失败'))
    }
  }, [])

  const getUsers = () => loadJSON<UsersMap>(USERS_KEY, {})

  const login = async (username: string, password: string) => {
    try {
      const u = username.trim().toLowerCase()
      const users = getUsers()
      if (!Object.hasOwn(users, u) || typeof users[u] !== 'string')
        return { ok: false, error: '账号不存在' }
      if (users[u] !== (await sha256(password)))
        return { ok: false, error: '密码错误' }
      saveJSON(SESSION_KEY, { username: u, loginAt: Date.now() })
      setUser(u)
      return { ok: true }
    } catch {
      return { ok: false, error: '本地账号信息保存失败，请检查存储权限与空间' }
    }
  }

  const register = async (username: string, password: string) => {
    try {
      const u = username.trim().toLowerCase()
      if (
        !/^[a-z0-9_-]{3,40}$/.test(u) ||
        ['__proto__', 'prototype', 'constructor'].includes(u)
      )
        return {
          ok: false,
          error: '账号需为3至40位字母、数字、下划线或连字符，且不是保留名称',
        }
      if (password.length < 4) return { ok: false, error: '密码至少 4 位' }
      const hashed = await sha256(password)
      const users = getUsers()
      if (Object.hasOwn(users, u)) return { ok: false, error: '账号已存在' }
      saveJSON(USERS_KEY, { ...users, [u]: hashed })
      saveJSON(SESSION_KEY, { username: u, loginAt: Date.now() })
      setUser(u)
      return { ok: true }
    } catch {
      return { ok: false, error: '本地账号信息保存失败，请检查存储权限与空间' }
    }
  }

  const logout = () => {
    try {
      saveJSON<Session | null>(SESSION_KEY, null)
      setUser(null)
      return true
    } catch {
      toast.error('退出失败：浏览器无法保存会话状态，请检查存储权限后重试')
      return false
    }
  }

  const changePassword = async (oldP: string, newP: string) => {
    try {
      if (!user) return { ok: false, error: '未登录' }
      if (newP.length < 4) return { ok: false, error: '新密码至少 4 位' }
      const users = getUsers()
      if (users[user] !== (await sha256(oldP)))
        return { ok: false, error: '原密码错误' }
      users[user] = await sha256(newP)
      saveJSON(USERS_KEY, users)
      return { ok: true }
    } catch {
      return { ok: false, error: '本地账号信息保存失败，请检查存储权限与空间' }
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}
