"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen } from "lucide-react";
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

  const project = state.currentProject;
  const hasGeneratedContent = Boolean(project?.sections.length);

  useEffect(() => {
    const id = params.id as string;
    if (project?.id === id) return;

    let cancelled = false;

    async function loadProject() {
      try {
        const found = await fetchProject(id);
        if (!cancelled) {
          dispatch({ type: "SET_PROJECT", payload: found });
        }
      } catch (e) {
        console.error("Failed to load project", e);
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
      <div className="flex-1 flex flex-col animate-pulse">
        <header className="border-b bg-background/80">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-5 bg-muted rounded w-48" />
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <div className="h-28 bg-muted rounded-lg" />
              <div className="h-96 bg-muted rounded-lg" />
            </div>
            <div className="lg:col-span-3">
              <div className="h-72 bg-muted rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
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
            <span className="text-sm font-medium truncate">{project.rawIdea}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {project.model ? "模型已定义" : "新项目"}
            </Badge>
          </div>
        </div>
      </header>

      <main
        className={`flex-1 mx-auto w-full px-6 py-8 animate-fade-in ${
          hasGeneratedContent ? "max-w-5xl" : "max-w-6xl"
        }`}
      >
        <div
          className={
            hasGeneratedContent
              ? "space-y-6"
              : "grid grid-cols-1 lg:grid-cols-5 gap-8"
          }
        >
          {!hasGeneratedContent && (
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-card/50 rounded-lg p-4 ring-1 ring-border">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  AI 分析结果
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {project.refinedIdea}
                </p>
              </div>

              <ModelWizard
                onComplete={() => {
                  toast.success("模型定义已完成，可以生成 Model Setup");
                }}
              />
            </div>
          )}

          <div className={hasGeneratedContent ? "space-y-6" : "lg:col-span-3 space-y-6"}>
            <ErrorBoundary>
              <OutputPanel
                sections={project.sections}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                literatureContent={literatureContent}
                isLoadingLiterature={isLoadingLit}
                onGenerateReferences={handleGenerateReferences}
              />
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
