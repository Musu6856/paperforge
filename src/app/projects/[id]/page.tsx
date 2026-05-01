"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { ErrorBoundary } from "@/components/error-boundary";
import { ModelWizard } from "@/components/model-wizard";
import { OutputPanel } from "@/components/output-panel";
import { chatStream, fetchLiterature, fetchProject } from "@/lib/api";
import { modelSetupPrompt } from "@/lib/prompts";
import { toast } from "sonner";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingLit, setIsLoadingLit] = useState(false);
  const [literatureContent, setLiteratureContent] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState(false);

  const project = state.currentProject;
  const hasGeneratedContent = Boolean(project?.sections.length);

  useEffect(() => {
    const id = params.id as string;
    if (project?.id === id) return;

    let cancelled = false;

    async function loadProject() {
      setLoadError(false);
      try {
        const found = await fetchProject(id);
        if (!cancelled) {
          dispatch({ type: "SET_PROJECT", payload: found });
        }
      } catch (e) {
        console.error("Failed to load project", e);
        if (!cancelled) {
          setLoadError(true);
        }
        toast.error("项目加载失败");
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [params.id, project?.id, dispatch]);

  const handleGenerate = useCallback(async () => {
    if (!project?.model || isGenerating) return;
    setIsGenerating(true);

    try {
      const sectionId = `model-setup-${Date.now()}`;
      let content = "";
      await chatStream(
        [
          {
            role: "user",
            content: modelSetupPrompt(JSON.stringify(project.model, null, 2)),
          },
        ],
        (text) => {
          content = text;
        }
      );

      dispatch({
        type: "ADD_SECTION",
        payload: {
          id: sectionId,
          title: "Model Setup",
          content,
          status: "generated",
        },
      });

      toast.success("Model Setup 已生成");

      setIsLoadingLit(true);
      const litContent = await fetchLiterature(project.model);
      setLiteratureContent(litContent);
      dispatch({
        type: "ADD_SECTION",
        payload: {
          id: `references-${Date.now()}`,
          title: "References",
          content: litContent,
          status: "generated",
        },
      });
      toast.success("参考文献推荐已生成");
    } catch (e) {
      console.error("Generation error", e);
      toast.error("生成失败", { description: "AI 服务暂时不可用" });
    } finally {
      setIsGenerating(false);
      setIsLoadingLit(false);
    }
  }, [project, isGenerating, dispatch]);

  const handleGenerateReferences = useCallback(async () => {
    if (!project?.model || isLoadingLit) return;
    setIsLoadingLit(true);

    try {
      const litContent = await fetchLiterature(project.model);
      setLiteratureContent(litContent);
      dispatch({
        type: "ADD_SECTION",
        payload: {
          id: `references-${Date.now()}`,
          title: "References",
          content: litContent,
          status: "generated",
        },
      });
      toast.success("参考文献推荐已生成");
    } catch (e) {
      console.error("Literature generation error", e);
      toast.error("参考文献生成失败", {
        description: "AI 服务暂时不可用，请稍后再试",
      });
    } finally {
      setIsLoadingLit(false);
    }
  }, [project, isLoadingLit, dispatch]);

  if (!project) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="border-b bg-background/90">
          <div className="mx-auto max-w-7xl px-5 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">加载项目</p>
                <p className="text-xs text-muted-foreground">
                  正在恢复你的论文工作台
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-6 sm:px-6">
          {loadError ? (
            <Card className="mx-auto mt-10 max-w-lg border-destructive/20 bg-card shadow-sm">
              <CardContent className="flex flex-col items-center px-6 py-10 text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <h1 className="text-base font-semibold">项目加载失败</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  当前项目没有成功恢复。你可以返回首页重新打开，或稍后再试。
                </p>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" onClick={() => router.push("/")}>
                    返回首页
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    重新加载
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
              <div className="space-y-4 animate-pulse">
                <div className="h-32 rounded-lg bg-muted" />
                <div className="h-[520px] rounded-lg bg-muted" />
              </div>
              <div className="animate-pulse">
                <div className="h-[520px] rounded-lg bg-muted" />
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="truncate text-sm font-medium">{project.rawIdea}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {project.model ? "模型已定义" : "新项目"}
            </Badge>
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-7xl flex-1 px-5 py-6 animate-fade-in sm:px-6"
      >
        <div className={hasGeneratedContent ? "grid gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]" : "mx-auto max-w-3xl space-y-4"}>
          {hasGeneratedContent && (
            <aside className="space-y-4">
              <Card className="border-0 bg-card/80 shadow-sm ring-1 ring-border">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        项目上下文
                      </p>
                      <h1 className="mt-2 line-clamp-2 text-base font-semibold leading-6">
                        {project.rawIdea}
                      </h1>
                    </div>
                    <Badge variant="secondary">已生成</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-y py-3">
                    <ProjectMetric
                      label="模型"
                      value={project.model ? "已定义" : "待定义"}
                    />
                    <ProjectMetric
                      label="章节"
                      value={project.sections.length.toString()}
                    />
                    <ProjectMetric
                      label="文献"
                      value={project.references.length.toString()}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <SparkLabel icon={<FileText className="h-3.5 w-3.5" />}>
                        AI 分析结果
                      </SparkLabel>
                    </div>
                    <p className="max-h-56 overflow-auto whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {project.refinedIdea || "暂无分析结果。"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-card/70 ring-1 ring-border">
                <CardContent className="space-y-3 p-4">
                  <SparkLabel icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                    已完成的流程
                  </SparkLabel>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      模型定义已保存
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Model Setup 可阅读和导出
                    </div>
                    <div className="flex items-center gap-2">
                      {isLoadingLit ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                      参考文献推荐可在右侧打开
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          )}

          {!hasGeneratedContent && (
            <>
              <Card className="border-0 bg-card/80 shadow-sm ring-1 ring-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        项目上下文
                      </p>
                      <h1 className="mt-2 line-clamp-2 text-base font-semibold leading-6">
                        {project.rawIdea}
                      </h1>
                    </div>
                    <Badge variant="outline">建模中</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-y py-3 mt-4">
                    <ProjectMetric
                      label="模型"
                      value={project.model ? "已定义" : "待定义"}
                    />
                    <ProjectMetric
                      label="章节"
                      value={project.sections.length.toString()}
                    />
                    <ProjectMetric
                      label="文献"
                      value={project.references.length.toString()}
                    />
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <SparkLabel icon={<FileText className="h-3.5 w-3.5" />}>
                        AI 分析结果
                      </SparkLabel>
                    </div>
                    <p className="max-h-56 overflow-auto whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {project.refinedIdea || "暂无分析结果。"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {wizardCompleted ? (
                <Card className="border-0 bg-card/80 shadow-sm ring-1 ring-border">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold">模型定义已完成</h2>
                        <p className="text-xs text-muted-foreground">点击下方按钮生成 Model Setup 正文和参考文献</p>
                      </div>
                    </div>
                    <Button
                      className="w-full h-10 gap-2"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          生成 Model Setup
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <ModelWizard
                  onComplete={() => {
                    setWizardCompleted(true);
                    toast.success("模型定义已完成，可以生成 Model Setup");
                  }}
                />
              )}
            </>
          )}

          {hasGeneratedContent && (
            <section className="min-w-0 space-y-6">
              <ErrorBoundary
                fallback={
                  <Card className="border-destructive/20 bg-card">
                    <CardContent className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-destructive/10">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <h2 className="text-sm font-semibold">输出面板出现错误</h2>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                        生成内容没有被修改。刷新页面后可以继续查看项目。
                      </p>
                      <Button className="mt-5" onClick={() => window.location.reload()}>
                        刷新页面
                      </Button>
                    </CardContent>
                  </Card>
                }
              >
                <OutputPanel
                  sections={project.sections}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerate}
                  literatureContent={literatureContent}
                  isLoadingLiterature={isLoadingLit}
                  onGenerateReferences={handleGenerateReferences}
                />
              </ErrorBoundary>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function ProjectMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function SparkLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {children}
    </div>
  );
}
