// 顶部栏：菜单按钮（弹出导航抽屉）、主题切换、账号菜单
import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { Menu, Moon, Sun, LogOut, User, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useData } from '@/context/data'
import { useAuth } from '@/context/auth'
import { SideNav } from './app-sidebar'
import { NAV } from '@/lib/navigation'
const CommandPalette = lazy(() => import('./command-palette'))

export function AppHeader() {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const { hasUnsaved } = useData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [command, setCommand] = useState(false)
  const location = useLocation()
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommand((previous) => !previous)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  return (
    <header className="app-header">
      {/* 弹出导航抽屉：左滑覆盖，不占用页面宽度 */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="打开导航菜单"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <SideNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="header-breadcrumb">
        <span>学习空间</span>
        <i>/</i>
        <strong>
          {NAV.find((item) => location.pathname.startsWith(item.to))?.label ??
            '知行'}
        </strong>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          className="command-trigger"
          aria-label="搜索页面或操作"
          onClick={() => setCommand(true)}
        >
          <Search size={16} />
          <span>快速查找</span>
          <kbd>⌘ K</kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="切换主题"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
                if (
                  hasUnsaved &&
                  !window.confirm(
                    '当前更改尚未保存，请先导出备份。仍要退出并放弃这些更改吗？',
                  )
                )
                  return
                if (logout()) navigate('/login')
              }}
            >
              <LogOut className="size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {command && (
        <Suspense fallback={null}>
          <CommandPalette open={command} onOpenChange={setCommand} />
        </Suspense>
      )}
    </header>
  )
}
