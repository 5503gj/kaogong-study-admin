// 顶部栏：菜单按钮（弹出导航抽屉）、主题切换、账号菜单
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { Menu, Moon, Sun, LogOut, User, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/AuthContext"
import { SideNav } from "./app-sidebar"

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-4">
      {/* 弹出导航抽屉：左滑覆盖，不占用页面宽度 */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="打开导航菜单">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <SideNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div className="brand-gradient flex size-7 items-center justify-center rounded-lg text-white shadow-sm">
          <GraduationCap className="size-4" />
        </div>
        <span className="text-sm font-semibold">考公备考系统</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="切换主题"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="账号">
              <User className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout()
                navigate("/login")
              }}
            >
              <LogOut className="size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
