// 应用主体布局：顶部栏（含弹出导航）+ 内容区（Outlet 全宽）
import { Outlet } from "react-router-dom"
import { AppHeader } from "./app-header"

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
