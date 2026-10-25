import {LayoutDashboard,BookOpen,ListTodo,CalendarCheck,Library,Timer,Bot,Settings,AlertTriangle} from "lucide-react"
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

