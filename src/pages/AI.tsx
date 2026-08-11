// AI 教学助手页：实时建议 + 问答聊天
import { Sparkles, Bot } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartSuggestions } from "@/components/ai/smart-suggestions"
import { AIChat } from "@/components/ai/ai-chat"

export function AI() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">考公老师</h1>
        <p className="text-sm text-muted-foreground">
          考公 AI 导师：实时建议 + 解答行测 / 申论 / 面试 / 时政问题，讲解考点。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" /> 实时建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SmartSuggestions />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="size-4 text-primary" /> 答疑 / 教学
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AIChat />
              <p className="mt-2 text-xs text-muted-foreground">
                提示：默认本地解答，无需联网。在「设置」填入大模型接口与 Key 后可获得更强回答。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
