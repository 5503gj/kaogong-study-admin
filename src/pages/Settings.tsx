// 设置页：学习目标 / 修改密码 / AI 配置 / 通知权限 / 数据备份与恢复
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Download,
  Upload,
  Trash2,
  Save,
  KeyRound,
  Bot,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useData } from '@/context/data'
import { useAuth } from '@/context/auth'
import { todayISO } from '@/lib/format'
import { testConnection } from '@/lib/ai'
import {
  createBackup,
  parseBackup,
  emptyDataset,
  type Dataset,
} from '@/lib/backup'

// 常见大模型服务商预设（兼容 OpenAI Chat Completions 协议）
const AI_PROVIDERS = [
  {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
  },
  {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  },
  {
    name: '阿里云百炼 / 通义千问',
    endpoint:
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus',
  },
  {
    name: '智谱 GLM',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
  },
  {
    name: '火山方舟 / 豆包',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-seed-1-6',
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
    restoreImport,
  } = useData()
  const { changePassword } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [dailyMinutes, setDailyMinutes] = useState(String(goal.dailyMinutes))
  const [weeklyDays, setWeeklyDays] = useState(String(goal.weeklyDays))
  const [examDate, setExamDate] = useState(goal.examDate ?? '')
  const [oldP, setOldP] = useState('')
  const [newP, setNewP] = useState('')

  const [endpoint, setEndpoint] = useState(aiConfig.endpoint)
  const [apiKey, setApiKey] = useState(aiConfig.apiKey)
  const [model, setModel] = useState(aiConfig.model)
  const [aiEnabled, setAiEnabled] = useState(aiConfig.enabled)
  const [shareProfile, setShareProfile] = useState(
    aiConfig.shareProfile ?? false,
  )
  const [provider, setProvider] = useState('')
  const [testing, setTesting] = useState(false)

  const applyFields = (data: Pick<Dataset, 'aiConfig' | 'goal'>) => {
    setDailyMinutes(String(data.goal.dailyMinutes))
    setWeeklyDays(String(data.goal.weeklyDays))
    setExamDate(data.goal.examDate ?? '')
    setApiKey('')
    setAiEnabled(false)
    setEndpoint(data.aiConfig.endpoint)
    setModel(data.aiConfig.model)
    setShareProfile(data.aiConfig.shareProfile ?? false)
  }
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
      shareProfile,
      endpoint: endpoint.trim() || 'https://api.openai.com/v1/chat/completions',
      apiKey: apiKey.trim(),
      model: model.trim() || 'gpt-4o-mini',
    })
    setTesting(false)
    if (r.ok) toast.success(r.message)
    else toast.error(r.message)
  }

  const saveGoal = () => {
    const d = Number(dailyMinutes)
    const w = Number(weeklyDays)
    if (
      !Number.isFinite(d) ||
      d < 0 ||
      d > 1440 ||
      !Number.isInteger(w) ||
      w < 0 ||
      w > 7
    ) {
      toast.error('请填写有效的数字')
      return
    }
    setGoal({ dailyMinutes: d, weeklyDays: w, examDate: examDate || undefined })
    toast.message('目标已更新，保存结果见顶部状态')
  }

  const changePw = async () => {
    const res = await changePassword(oldP, newP)
    if (res.ok) {
      toast.success('密码已修改')
      setOldP('')
      setNewP('')
    } else {
      toast.error(res.error ?? '修改失败')
    }
  }

  const saveAI = () => {
    setAIConfig({
      enabled: aiEnabled,
      shareProfile,
      endpoint: endpoint.trim() || 'https://api.openai.com/v1/chat/completions',
      apiKey: apiKey.trim(),
      model: model.trim() || 'gpt-4o-mini',
    })
    toast.message('AI 配置已更新；Key 仅保留在当前页面内存')
  }

  const requestNotify = async () => {
    if (!('Notification' in window)) {
      toast.error('当前浏览器不支持通知')
      return
    }
    const p = await Notification.requestPermission()
    toast.success(p === 'granted' ? '已开启通知，关键提醒会弹窗' : '通知未授权')
  }

  const exportData = () => {
    const data = createBackup({
      sessions,
      todos,
      dailyTasks,
      focusSessions,
      goal,
      aiConfig,
      questionBank,
      wrongQuestions,
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kaogong-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('已导出备份')
  }

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('备份不能超过50MiB')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const raw = JSON.parse(String(reader.result)),
          data = parseBackup(raw)
        if (
          !window.confirm(
            `将以备份覆盖当前本地空间：${data.sessions.length}条记录、${data.questionBank.length}道题、${data.wrongQuestions.length}条错题。会保留导入前快照，凭证不会导入。是否继续？`,
          )
        )
          return
        await importData(raw)
        applyFields(data)
        toast.success('已校验并完整导入，可恢复导入前快照')
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : '导入失败，原数据未修改',
        )
      }
    }
    reader.onerror = () => toast.error('无法读取备份文件，原数据未修改')
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = async () => {
    if (
      window.confirm(
        '确定清空所有备考记录、考点清单、每日任务、专注记录、题库与错题本吗？将保留清空前快照，但仍建议先导出备份。',
      )
    ) {
      try {
        await resetAll()
        applyFields(emptyDataset())
        toast.success('已清空当前空间，刷新不会重建演示记录')
      } catch {
        toast.error('清空失败，数据未修改')
      }
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

      <p className="text-sm">
        Key仅保留在当前页面内存，刷新或切换账号后需重新填写。学习数据与压缩照片保存在当前浏览器的IndexedDB本地空间，备份不含Key。外部模型会收到对话；学习画像需另行选择。
      </p>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={shareProfile}
          onChange={(e) => setShareProfile(e.target.checked)}
        />
        允许向所配置的模型服务发送学习画像
      </label>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            applyFields(await restoreImport())
            toast.success('已恢复导入前快照')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '恢复失败')
          }
        }}
      >
        恢复最近导入或清空前的快照
      </Button>
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
            默认本地启发式答疑（无需联网）。填入兼容 OpenAI 的接口与 Key
            后，可调用真实大模型。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              启用真实大模型
            </span>
            <Button
              size="sm"
              variant={aiEnabled ? 'default' : 'outline'}
              onClick={() => setAiEnabled((v) => !v)}
            >
              {aiEnabled ? '已开启' : '已关闭'}
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
              {testing ? '测试中…' : '测试连接'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            不填 Key 也能用（本地智能体，覆盖考公常见问答）。填入任意兼容 OpenAI
            协议的接口与 Key
            后，可以请求模型协助分析题目（需独立核对）。密钥仅驻留页面内存，刷新后需重填。
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
