// 鉴权 Context：基于 localStorage 的本地账号系统（含默认演示账号）
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { sha256 } from "@/lib/hash"
import { loadJSON, saveJSON } from "@/lib/storage"

type UsersMap = Record<string, string> // username -> 密码哈希

interface Session {
  username: string
  loginAt: number
}

interface AuthValue {
  user: string | null
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  changePassword: (oldP: string, newP: string) => Promise<{ ok: boolean; error?: string }>
}

const USERS_KEY = "study-admin:users"
const SESSION_KEY = "study-admin:session"

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(() => {
    const s = loadJSON<Session | null>(SESSION_KEY, null)
    return s?.username ?? null
  })

  // 首次启动写入默认演示账号：admin / 123456
  useEffect(() => {
    const users = loadJSON<UsersMap>(USERS_KEY, {})
    if (Object.keys(users).length === 0) {
      sha256("123456").then((h) => saveJSON(USERS_KEY, { admin: h }))
    }
  }, [])

  const getUsers = () => loadJSON<UsersMap>(USERS_KEY, {})

  const login = async (username: string, password: string) => {
    const u = username.trim().toLowerCase()
    const users = getUsers()
    if (!users[u]) return { ok: false, error: "账号不存在" }
    if (users[u] !== (await sha256(password)))
      return { ok: false, error: "密码错误" }
    saveJSON(SESSION_KEY, { username: u, loginAt: Date.now() })
    setUser(u)
    return { ok: true }
  }

  const register = async (username: string, password: string) => {
    const u = username.trim().toLowerCase()
    if (u.length < 3) return { ok: false, error: "账号至少 3 个字符" }
    if (password.length < 4) return { ok: false, error: "密码至少 4 位" }
    const users = getUsers()
    if (users[u]) return { ok: false, error: "账号已存在" }
    users[u] = await sha256(password)
    saveJSON(USERS_KEY, users)
    saveJSON(SESSION_KEY, { username: u, loginAt: Date.now() })
    setUser(u)
    return { ok: true }
  }

  const logout = () => {
    saveJSON<Session | null>(SESSION_KEY, null)
    setUser(null)
  }

  const changePassword = async (oldP: string, newP: string) => {
    if (!user) return { ok: false, error: "未登录" }
    if (newP.length < 4) return { ok: false, error: "新密码至少 4 位" }
    const users = getUsers()
    if (users[user] !== (await sha256(oldP)))
      return { ok: false, error: "原密码错误" }
    users[user] = await sha256(newP)
    saveJSON(USERS_KEY, users)
    return { ok: true }
  }

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用")
  return ctx
}
