// 应用根组件：路由 + 全局 Provider
import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { DataProvider } from "@/context/DataContext"
import { ProtectedRoute } from "@/components/protected-route"
import { AppLayout } from "@/components/app-layout"
import { Login } from "@/pages/Login"
import { Dashboard } from "@/pages/Dashboard"
import { Records } from "@/pages/Records"
import { Todos } from "@/pages/Todos"
import { Daily } from "@/pages/Daily"
import { Focus } from "@/pages/Focus"
import { AI } from "@/pages/AI"
import { QuestionBank } from "@/pages/QuestionBank"
import { WrongAnalysis } from "@/pages/WrongAnalysis"
import { Settings } from "@/pages/Settings"

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </HashRouter>
      </DataProvider>
    </AuthProvider>
  )
}
