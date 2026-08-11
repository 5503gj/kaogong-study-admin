// 设置页：学习目标 / 修改密码 / AI 配置 / 通知权限 / 数据备份与恢复
import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  Download,
  Upload,
  Trash2,
  Save,
  KeyRound,
  Bot,
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useData } from "@/context/DataContext"
import { useAuth } from "@/context/AuthContext"
import { todayISO } from "@/lib/format"
import { testConnection } from "@/lib/ai"
import type { BackupData } from "@/types"

// 常见大模型服务商预设（兼容 OpenAI Chat Completions 协议）
const AI_PROVIDERS = [
  {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
  },
  {
    name: "阿里云百炼 / 通义千问",
    endpoint:
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-plus",
  },
  {
    name: "智谱 GLM",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4-flash",
  },
  {
    name: "火山方舟 / 豆包",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    model: "doubao-seed-1-6",
  },
]

export function Settings() {
  const {
    goal,
    setGoal,
    sessions,
    todos,
    dailyTasks,
    focusSessions,
    questionBank,
    wrongQuestions,
    aiConfig,
    setAIConfig,
    importData,
    resetAll,
  } = useData()
  const { changePassword } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [dailyMinutes, setDailyMinutes] = useState(String(goal.dailyMinutes))
  const [weeklyDays, setWeeklyDays] = useState(String(goal.weeklyDays))
  const [examDate, setExamDate] = useState(goal.examDate ?? "")
  const [oldP, setOldP] = useState("")
  const [newP, setNewP] = useState("")

  const [endpoint, setEndpoint] = useState(aiConfig.endpoint)
  const [apiKey, setApiKey] = useState(aiConfig.apiKey)
  const [model, setModel] = useState(aiConfig.model)
  const [aiEnabled, setAiEnabled] = useState(aiConfig.enabled)
  const [provider, setProvider] = useState("")
  const [testing, setTesting] = useState(false)

  const applyProvider = (name: string) => {
    setProvider(name)
    const p = AI_PROVIDERS.find((x) => x.name === name)
    if (p) {
      setEndpoint(p.endpoint)
      setModel(p.model)
    }
  }

  const testAI = async () => {
    setTesting(true)
    const r = await testConnection({
      enabled: aiEnabled,
      endpoint: endpoint.trim() || "https://api.openai.com/v1/chat/completions",
      apiKey: apiKey.trim(),
      model: model.trim() || "gpt-4o-mini",
    })
    setTesting(false)
    if (r.ok) toast.success(r.message)
    else toast.error(r.message)
  }

  const saveGoal = () => {
    const d = Number(dailyMinutes)
    const w = Number(weeklyDays)
    if (!Number.isFinite(d) || d < 0 || !Number.isFinite(w) || w < 0) {
      toast.error("请填写有效的数字")
      return
    }
    setGoal({ dailyMinutes: d, weeklyDays: w, examDate: examDate || undefined })
    toast.success("目标已保存")
  }

  const changePw = async () => {
    const res = await changePassword(oldP, newP)
    if (res.ok) {
      toast.success("密码已修改")
      setOldP("")
      setNewP("")
    } else {
      toast.error(res.error ?? "修改失败")
    }
  }

  const saveAI = () => {
    setAIConfig({
      enabled: aiEnabled,
      endpoint: endpoint.trim() || "https://api.openai.com/v1/chat/completions",
      apiKey: apiKey.trim(),
      model: model.trim() || "gpt-4o-mini",
    })
    toast.success("AI 配置已保存")
  }

  const requestNotify = async () => {
    if (!("Notification" in window)) {
      toast.error("当前浏览器不支持通知")
      return
    }
    const p = await Notification.requestPermission()
    toast.success(p === "granted" ? "已开启通知，关键提醒会弹窗" : "通知未授权")
  }

  const exportData = () => {
    const data: BackupData = {
      version: 1,
      sessions,
      todos,
      dailyTasks,
      focusSessions,
      goal,
      aiConfig,
      questionBank,
      wrongQuestions,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kaogong-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("已导出备份")
  }

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Partial<BackupData>
        importData({
          sessions: data.sessions ?? [],
          todos: data.todos ?? [],
          dailyTasks: data.dailyTasks ?? [],
          focusSessions: data.focusSessions ?? [],
          goal: data.goal,
          aiConfig: data.aiConfig,
          questionBank: data.questionBank ?? [],
          wrongQuestions: data.wrongQuestions ?? [],
        })
        toast.success("已导入数据")
      } catch {
        toast.error("文件解析失败，请检查 JSON 格式")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleReset = () => {
    if (
      window.confirm(
        "确定清空所有备考记录、考点清单、每日任务、专注记录、题库与错题本吗？此操作不可恢复。",
      )
    ) {
      resetAll()
      toast.success("已清空")
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-sm text-muted-foreground">
          设定目标、接入 AI、管理通知与数据。
        </p>
      </div>

      {/* 学习目标 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">学习目标</CardTitle>
          <CardDescription>用于看板的「今日目标」进度与警醒。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="daily">每日目标（分钟）</Label>
            <Input
              id="daily"
              type="number"
              min={0}
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weekly">每周目标（天）</Label>
            <Input
              id="weekly"
              type="number"
              min={0}
              max={7}
              value={weeklyDays}
              onChange={(e) => setWeeklyDays(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam">目标考试日（用于倒计时提醒）</Label>
            <Input
              id="exam"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={saveGoal}>
            <Save className="size-4" /> 保存目标
          </Button>
        </CardContent>
      </Card>

      {/* AI 配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4" /> 考公老师（AI）
          </CardTitle>
          <CardDescription>
            默认本地启发式答疑（无需联网）。填入兼容 OpenAI 的接口与 Key 后，可调用真实大模型。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">启用真实大模型</span>
            <Button
              size="sm"
              variant={aiEnabled ? "default" : "outline"}
              onClick={() => setAiEnabled((v) => !v)}
            >
              {aiEnabled ? "已开启" : "已关闭"}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pv">服务商预设（一键填好接口与模型）</Label>
            <select
              id="pv"
              value={provider}
              onChange={(e) => applyProvider(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">自定义 / 其他</option>
              {AI_PROVIDERS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ep">接口地址</Label>
              <Input
                id="ep"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="md">模型名</Label>
              <Input
                id="md"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="key">API Key</Label>
            <Input
              id="key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... / 各平台密钥"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={saveAI}>
              <Save className="size-4" /> 保存 AI 配置
            </Button>
            <Button variant="outline" onClick={testAI} disabled={testing}>
              {testing ? "测试中…" : "测试连接"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            不填 Key 也能用（本地智能体，覆盖考公常见问答）。填入任意兼容 OpenAI
            协议的接口与 Key 后，老师会调用真实大模型逐步推理、解任意真题。密钥仅保存在你本机浏览器。
          </p>
        </CardContent>
      </Card>

      {/* 通知权限 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" /> 浏览器通知
          </CardTitle>
          <CardDescription>
            授权后，逾期待学 / 今日目标未达成会在系统级弹窗提醒你。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={requestNotify}>
            申请通知权限
          </Button>
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" /> 修改密码
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="old">原密码</Label>
            <Input
              id="old"
              type="password"
              value={oldP}
              onChange={(e) => setOldP(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">新密码</Label>
            <Input
              id="new"
              type="password"
              value={newP}
              onChange={(e) => setNewP(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={changePw}>修改密码</Button>
        </CardContent>
      </Card>

      {/* 数据备份 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">数据备份与恢复</CardTitle>
          <CardDescription>
            数据保存在本机浏览器。建议定期导出备份，换设备时可导入。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportData}>
            <Download className="size-4" /> 导出备份
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> 导入备份
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={importFile}
          />
          <Button variant="destructive" onClick={handleReset}>
            <Trash2 className="size-4" /> 清空所有数据
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
