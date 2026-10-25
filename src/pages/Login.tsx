// 登录 / 注册页
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { GraduationCap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/context/auth"

export function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname

  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("123456")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res =
      mode === "login"
        ? await login(username, password)
        : await register(username, password)
    setLoading(false)
    if (res.ok) {
      toast.success(mode === "login" ? "登录成功" : "注册成功")
      navigate(from && from !== "/login" ? from : "/dashboard", { replace: true })
    } else {
      toast.error(res.error ?? "操作失败")
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-3xl overflow-hidden p-0 shadow-lg">
        <div className="grid md:grid-cols-2">
          {/* 左侧品牌区（移动端隐藏） */}
          <div className="relative hidden flex-col justify-between bg-primary p-8 text-primary-foreground md:flex">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-6" />
              <span className="text-lg font-semibold">考公备考系统</span>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold leading-snug">
                记录你的备考时间、<br />看得见自己的成长。
              </p>
              <p className="text-sm text-primary-foreground/80">
                备考记录 · 备考看板 · 考点清单，一站式备考。
              </p>
            </div>
            <p className="text-xs text-primary-foreground/60">
              Kaogong Prep · 本地空间 · 定期备份
            </p>
          </div>

          {/* 右侧表单 */}
          <CardContent className="p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold">
                {mode === "login" ? "欢迎回来" : "创建账号"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "login"
                  ? "登录以继续使用考公备考系统"
                  : "创建浏览器本地空间；不构成服务器安全认证"}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">账号</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {mode === "login" ? "登录" : "注册并登录"}
              </Button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
              </button>
            </div>

            {mode === "login" && (
              <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                演示账号：<b>admin</b> / 密码：<b>123456</b>
              </p>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  )
}
