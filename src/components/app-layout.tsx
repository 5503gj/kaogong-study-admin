// 应用主体布局：顶部栏（含弹出导航）+ 内容区（Outlet 全宽）
import { Outlet } from "react-router-dom"
import { AppHeader } from "./app-header"
import { SideNav } from "./app-sidebar"
import { Toaster } from "@/components/ui/sonner"

export function AppLayout() {
  return (
    <div className="min-h-svh bg-muted/30">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-64 shrink-0 border-r bg-card/80 py-3 backdrop-blur md:flex">
          <SideNav />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
