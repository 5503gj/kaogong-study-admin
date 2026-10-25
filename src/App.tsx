// 应用根组件：路由 + 全局 Provider
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { useAuth } from '@/context/auth'
import { AuthProvider } from '@/context/AuthContext'
import { DataProvider } from '@/context/DataContext'
import { ProtectedRoute } from '@/components/protected-route'
import { AppLayout } from '@/components/app-layout'
import { Login } from '@/pages/Login'
import { Toaster } from '@/components/ui/sonner'
const Pilot = lazy(() =>
  import('@/pages/Pilot').then((m) => ({ default: m.Pilot })),
)
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const Records = lazy(() =>
  import('@/pages/Records').then((m) => ({ default: m.Records })),
)
const Todos = lazy(() =>
  import('@/pages/Todos').then((m) => ({ default: m.Todos })),
)
const Daily = lazy(() =>
  import('@/pages/Daily').then((m) => ({ default: m.Daily })),
)
const Focus = lazy(() =>
  import('@/pages/Focus').then((m) => ({ default: m.Focus })),
)
const AI = lazy(() => import('@/pages/AI').then((m) => ({ default: m.AI })))
const QuestionBank = lazy(() =>
  import('@/pages/QuestionBank').then((m) => ({ default: m.QuestionBank })),
)
const WrongAnalysis = lazy(() =>
  import('@/pages/WrongAnalysis').then((m) => ({ default: m.WrongAnalysis })),
)
const Settings = lazy(() =>
  import('@/pages/Settings').then((m) => ({ default: m.Settings })),
)

function AccountData({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <DataProvider key={user ?? 'guest'}>{children}</DataProvider>
}

export default function App() {
  return (
    <AuthProvider>
      <AccountData>
        <HashRouter>
          <Suspense fallback={<p role="status">正在加载页面…</p>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/pilot" element={<Pilot />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/records" element={<Records />} />
                <Route path="/todos" element={<Todos />} />
                <Route path="/daily" element={<Daily />} />
                <Route path="/questions" element={<QuestionBank />} />
                <Route path="/wrong-analysis" element={<WrongAnalysis />} />
                <Route path="/focus" element={<Focus />} />
                <Route path="/ai" element={<AI />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="/" element={<Navigate to="/pilot" replace />} />
              <Route path="*" element={<Navigate to="/pilot" replace />} />
            </Routes>
          </Suspense>
          <Toaster />
        </HashRouter>
      </AccountData>
    </AuthProvider>
  )
}
