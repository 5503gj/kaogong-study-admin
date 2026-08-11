// 侧边导航内容（作为可弹出抽屉使用，不常驻占用页面宽度）
import { NavLink, useLocation } from "react-router-dom"
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  ListTodo,
  CalendarCheck,
  Library,
  Timer,
  Bot,
  Settings,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

export const NAV = [
  { to: "/dashboard", label: "备考看板", icon: LayoutDashboard },
  { to: "/records", label: "备考记录", icon: BookOpen },
  { to: "/todos", label: "考点清单", icon: ListTodo },
  { to: "/daily", label: "每日备考", icon: CalendarCheck },
  { to: "/questions", label: "题库刷题", icon: Library },
  { to: "/wrong-analysis", label: "错题分析", icon: AlertTriangle },
  { to: "/focus", label: "专注模式", icon: Timer },
  { to: "/ai", label: "考公老师", icon: Bot },
  { to: "/settings", label: "设置", icon: Settings },
]

/** 抽屉里的导航列表；onNavigate 用于点击后自动收起抽屉 */
export function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">考公备考系统</span>
          <span className="text-xs text-muted-foreground">Kaogong Prep</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {NAV.map((item) => {
          const active =
            item.to === "/dashboard"
              ? location.pathname === "/dashboard" || location.pathname === "/"
              : location.pathname.startsWith(item.to)
          return (
            <NavLink key={item.to} to={item.to} onClick={onNavigate}>
              <Button
                variant={active ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
              >
                <item.icon className="size-4" />
                {item.label}
              </Button>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        当前账号：{user}
      </div>
    </div>
  )
}
