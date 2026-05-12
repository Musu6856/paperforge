"use client";

import { cloneElement, useState, type ReactElement, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { chatStream, createProject } from "@/lib/api";
import { ideaParserPrompt } from "@/lib/prompts";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Folder,
  Library,
  LockKeyhole,
  Loader2,
  Network,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const { isLoaded, isSignedIn } = useUser();
  const [idea, setIdea] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  async function handleStart() {
    if (!idea.trim() || isProcessing || !isSignedIn) return;
    setIsProcessing(true);

    try {
      let refinedIdea = "";
      await chatStream(
        [{ role: "user", content: ideaParserPrompt(idea) }],
        (text) => {
          refinedIdea = text;
        }
      );

      const project = await createProject({
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        rawIdea: idea,
        refinedIdea,
        model: null,
        wizardCompleted: false,
        sections: [],
        references: [],
      });

      dispatch({
        type: "NEW_PROJECT",
        payload: project,
      });

      router.push(`/projects/${project.id}`);
    } catch (e) {
      console.error("Failed to process idea", e);
      toast.error("创建项目失败", {
        description: "AI 分析暂时不可用，请稍后再试",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight">
                PaperForge
              </span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                Beta
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    登录
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">注册</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 px-5 py-8 sm:px-6 lg:py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5 animate-fade-in">
            <div className="space-y-3">
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  从研究想法开始，搭建可写入论文的博弈模型
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  输入一个研究问题，PaperForge 会先整理建模方向，再进入参与者、策略、收益和平台属性的分步定义流程。
                </p>
              </div>
            </div>

            <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border">
              <div className="h-0.5 bg-primary" />
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">创建研究项目</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      建议写清研究对象、平台/市场场景和你关心的机制。
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit text-[10px]">
                    Step 1
                  </Badge>
                </div>
                <Textarea
                  placeholder="例如：分析网约车平台如何设计补贴策略来平衡司机和乘客双侧用户，在竞争环境中最大化平台利润..."
                  className="min-h-[170px] resize-y border-0 bg-muted/40 text-sm leading-relaxed ring-1 ring-input focus-visible:ring-primary"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {idea.trim().length > 0
                      ? `${idea.trim().length} 个字符，准备进入 AI 分析`
                      : "登录后可创建项目并保存到你的工作区"}
                  </p>
                  {isSignedIn ? (
                    <Button
                      className="h-9 gap-2 sm:w-auto"
                      onClick={handleStart}
                      disabled={!idea.trim() || isProcessing || !isLoaded}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          AI 分析中
                        </>
                      ) : (
                        <>
                          开始构建模型
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <SignInButton mode="modal">
                      <Button className="h-9 gap-2 sm:w-auto" disabled={!isLoaded}>
                        登录后开始
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </SignInButton>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-3">
              <WorkflowItem
                icon={<Sparkles className="h-4 w-4" />}
                title="整理 idea"
                description="把宽泛问题压成可建模的研究设定。"
              />
              <WorkflowItem
                icon={<Network className="h-4 w-4" />}
                title="定义模型"
                description="补齐参与者、策略、收益和平台属性。"
              />
              <WorkflowItem
                icon={<Library className="h-4 w-4" />}
                title="生成正文"
                description="输出 Model Setup、文献推荐和 LaTeX。"
              />
            </div>
          </section>

          <aside className="animate-fade-in">
            <Card className="h-fit border-0 bg-card/85 shadow-sm ring-1 ring-border">
              <CardContent className="flex flex-col gap-3 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-sm font-semibold">工作区</h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    刷新
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg border bg-accent/45 p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-primary ring-1 ring-border">
                      {isSignedIn ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <LockKeyhole className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {isSignedIn ? "已登录" : "待登录同步"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {isSignedIn
                          ? "项目已自动同步到云端"
                          : "登录后同步你的项目与设置"}
                      </p>
                    </div>
                  </div>
                  {!isSignedIn && (
                    <SignInButton mode="modal">
                      <Button size="sm" className="h-8 shrink-0">
                        登录 / 注册
                      </Button>
                    </SignInButton>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <StatusMetric
                    label="项目"
                    value={`${state.projects.length} 个`}
                    hint="已创建"
                  />
                  <StatusMetric
                    label="流程"
                    value={isSignedIn ? "可用" : "-"}
                    hint={isSignedIn ? "可继续" : "未登录"}
                  />
                </div>

                <div className="space-y-2.5 border-t pt-3">
                  <StatusLine
                    icon={<CheckCircle2 />}
                    text="自动保存"
                    description="每一步自动保存到工作区"
                  />
                  <StatusLine
                    icon={<FileText />}
                    text="Model Setup 导出"
                    description="一键导出模型设定文档"
                  />
                  <StatusLine
                    icon={<Clock3 />}
                    text="AI 生成通常约 30 秒"
                    description="视模型复杂度而定"
                  />
                </div>

                <div className="space-y-2.5 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">最近项目</h2>
                    {state.projects.length > 2 && (
                      <Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5" onClick={() => setShowAllProjects(!showAllProjects)}>
                        {showAllProjects ? "收起" : "查看全部"}
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showAllProjects ? "rotate-90" : ""}`} />
                      </Button>
                    )}
                  </div>
                  <RecentProjects
                    projects={state.projects}
                    onOpen={(id) => router.push(`/projects/${id}`)}
                    showAll={showAllProjects}
                  />
                </div>

                <div className="space-y-2 rounded-lg border bg-background/65 p-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">流程预览</h2>
                    <span className="text-xs text-muted-foreground">共 5 步</span>
                  </div>
                  <div className="relative grid grid-cols-5 items-start gap-1">
                    <div className="absolute left-[10%] right-[10%] top-2.5 h-px bg-border" />
                    {["创题设定", "参与者", "策略", "收益", "平台属性"].map(
                      (step, index) => (
                        <div key={step} className="relative text-center">
                          <div
                            className="relative z-10 mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-border data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                            data-active={index === 0}
                          >
                            {index + 1}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                            {step}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function WorkflowItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card/70 p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function StatusMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border bg-background/70 p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function StatusLine({
  icon,
  text,
  description,
}: {
  icon: ReactElement<{ className?: string }>;
  text: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {cloneElement(icon, {
        className: "mt-0.5 h-3.5 w-3.5 text-primary",
      })}
      <div>
        <p className="text-sm font-medium leading-4">{text}</p>
        <p className="text-xs leading-4 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function RecentProjects({
  projects,
  onOpen,
  showAll,
}: {
  projects: ReturnType<typeof useStore>["state"]["projects"];
  onOpen: (id: string) => void;
  showAll: boolean;
}) {
  if (projects.length === 0) {
    return (
      <div className="flex min-h-[74px] items-center justify-center rounded-lg border border-dashed bg-background/50 p-3 text-center">
        <div>
          <Folder className="mx-auto h-6 w-6 text-muted-foreground/45" />
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            暂无项目
          </p>
          <p className="text-xs text-muted-foreground">
            创建第一个项目后，它会显示在这里。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {(showAll ? projects : projects.slice(0, 2)).map((project) => (
        <button
          key={project.id}
          className="group flex w-full items-center justify-between gap-3 rounded-md border bg-background/70 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          onClick={() => onOpen(project.id)}
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {project.rawIdea}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {new Date(project.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}
