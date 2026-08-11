// 考公 AI 智能体聊天框：意图识别 + 多轮记忆 + 考生画像个性化 + 可选真实大模型
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Send, Bot, User, Sparkles, RotateCcw, Settings2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/DataContext"
import {
  callLLM,
  detectIntent,
  localAnswer,
  buildProfile,
  SUGGESTED_PROMPTS,
  type ChatMessage,
} from "@/lib/ai"

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "你好，我是你的考公 AI 导师 🤖 可以帮你：解真题（把题干发我）、讲行测方法、写申论、答结构化面试、梳理时政、做备考规划，还能分析你的错题并给提升方案。配置好大模型后我答疑更精准。",
}

const INTENT_LABEL: Record<string, string> = {
  solve: "解题",
  explain: "知识点讲解",
  plan: "备考规划",
  wrong: "错题分析",
  interview: "面试",
  shenlun: "申论",
  current: "时政",
  method: "方法",
  faq: "考公百科",
  general: "答疑",
}

export function AIChat() {
  const { aiConfig, wrongQuestions, sessions, goal, questionBank } = useData()
  const navigate = useNavigate()
  const localMode = !(aiConfig.enabled && aiConfig.apiKey)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [intent, setIntent] = useState<string>("")
  const endRef = useRef<HTMLDivElement>(null)

  const profile = useMemo(
    () => buildProfile({ wrongQuestions, sessions, goal }),
    [wrongQuestions, sessions, goal],
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const send = async (text: string) => {
    const q = (text ?? input).trim()
    if (!q || loading) return
    const next = [...messages, { role: "user" as const, content: q }]
    setMessages(next)
    setInput("")
    setLoading(true)
    const it = detectIntent(q)
    setIntent(INTENT_LABEL[it.intent] ?? "答疑")
    try {
      let reply: string
      if (aiConfig.enabled && aiConfig.apiKey) {
        reply = await callLLM(aiConfig, next, profile)
      } else {
        await new Promise((r) => setTimeout(r, 400))
        reply = localAnswer(q, { profile, bank: questionBank })
      }
      setMessages((m) => [...m, { role: "assistant", content: reply }])
    } catch (e) {
      toast.error("AI 调用失败：" + (e instanceof Error ? e.message : "未知错误"))
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "调用真实模型出错，已切回本地智能体：" + localAnswer(q, { profile, bank: questionBank }),
        },
      ])
    } finally {
      setLoading(false)
      setIntent("")
    }
  }

  const reset = () => {
    setMessages([GREETING])
  }

  return (
    <div className="flex h-[62vh] flex-col rounded-lg border">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" />
        考公老师（智能体）
        {intent && (
          <Badge variant="secondary" className="ml-1">
            正在{intent}…
          </Badge>
        )}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {aiConfig.enabled && aiConfig.apiKey ? "已接入大模型" : "本地智能体"}
          </span>
          <Button variant="ghost" size="icon" className="size-7" onClick={reset} aria-label="重置对话">
            <RotateCcw className="size-3.5" />
          </Button>
        </span>
      </div>

      {localMode && (
        <div className="m-3 mb-0 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground/80">
          <Zap className="size-3.5 shrink-0 text-primary" />
          <span className="flex-1">
            当前为本地智能体（无需联网，覆盖考公常见问答）。想解锁更强的大模型答疑，可接入 DeepSeek / 通义千问等。
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-primary"
            onClick={() => navigate("/settings")}
          >
            <Settings2 className="size-3.5" /> 去设置
          </Button>
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-auto p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              {m.role === "user" ? (
                <User className="size-4" />
              ) : (
                <Bot className="size-4 text-primary" />
              )}
            </div>
            <div
              className={`max-w-[82%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-muted">
              <Bot className="size-4 text-primary" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              智能体思考中…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* 快捷提问：让智能体直接按场景作答 */}
      <div className="flex flex-wrap gap-1.5 border-t px-3 pt-2">
        {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            disabled={loading}
            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 border-t p-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="问我考公问题，或把一道真题题干发给我…"
          className="min-h-0 flex-1 resize-none"
          rows={1}
        />
        <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
          <Send className="size-4" /> 发送
        </Button>
      </div>
    </div>
  )
}
