import { createContext, useContext } from 'react'
export interface AuthValue {
  user: string | null
  login: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>
  register: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>
  logout: () => boolean
  changePassword: (
    oldP: string,
    newP: string,
  ) => Promise<{ ok: boolean; error?: string }>
}

export const AuthContext = createContext<AuthValue | null>(null)
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
