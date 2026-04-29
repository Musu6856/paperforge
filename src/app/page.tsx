"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { chatStream } from "@/lib/api";
import { ideaParserPrompt } from "@/lib/prompts";
import { Loader2, ArrowRight, BookOpen, Sparkles, Network, Library } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [idea, setIdea] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleStart() {
    if (!idea.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      let refinedIdea = "";
      await chatStream(
        [{ role: "user", content: ideaParserPrompt(idea) }],
        (text) => {
          refinedIdea = text;
        }
      );

      const project = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        rawIdea: idea,
        refinedIdea,
        model: null,
        sections: [],
        references: [],
      };

      dispatch({
        type: "NEW_PROJECT",
        payload: project,
      });

      router.push(`/projects/${project.id}`);
    } catch (e) {
      console.error("Failed to process idea", e);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">PaperForge</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Beta</Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-20 animate-fade-in">
        <div className="max-w-2xl w-full text-center space-y-10">
          {/* Hero */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-background/60 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              AI 驱动的博弈论论文写作助手
            </div>
            <h1 className="text-5xl font-bold tracking-tight leading-tight">
              博弈论
              <span className="text-primary">论文工坊</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              输入你的研究 idea，AI 引导你逐步定义博弈模型，<br />
              生成专业的 <span className="font-medium text-foreground">Model Setup</span> 章节和经典文献推荐
            </p>
          </div>

          {/* Input Card */}
          <Card className="shadow-lg border-0 ring-1 ring-border overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
            <CardContent className="p-6 space-y-4">
              <Textarea
                placeholder="例如：分析网约车平台如何设计补贴策略来平衡司机和乘客双侧用户，在竞争环境中最大化平台利润..."
                className="min-h-[130px] resize-y bg-muted/50 border-0 ring-1 ring-input focus-visible:ring-primary text-sm leading-relaxed"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
              <Button
                className="w-full h-11 gap-2 text-base"
                onClick={handleStart}
                disabled={!idea.trim() || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI 分析中...
                  </>
                ) : (
                  <>
                    开始构建模型
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50">
              <Network className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">分步模型定义</p>
                <p className="text-xs text-muted-foreground mt-0.5">参与者 · 策略 · 收益 · 博弈类型</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">AI 生成章节</p>
                <p className="text-xs text-muted-foreground mt-0.5">Model Setup + LaTeX 渲染</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50">
              <Library className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">文献推荐</p>
                <p className="text-xs text-muted-foreground mt-0.5">经典双边平台论文匹配</p>
              </div>
            </div>
          </div>

          {/* Recent projects */}
          {state.projects.length > 0 && (
            <div className="text-left space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                近期项目
              </h2>
              <div className="space-y-2">
                {state.projects.slice(0, 5).map((p, i) => (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:bg-accent/50 transition-all duration-200 border-0 ring-1 ring-border hover:ring-primary/30 group animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => router.push(`/projects/${p.id}`)}
                  >
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{p.rawIdea}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
