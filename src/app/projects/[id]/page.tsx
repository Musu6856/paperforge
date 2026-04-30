"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, BookOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import { ErrorBoundary } from "@/components/error-boundary";
import { ModelWizard } from "@/components/model-wizard";
import { OutputPanel } from "@/components/output-panel";
import { LiteraturePanel } from "@/components/literature-panel";
import { chatStream, fetchLiterature } from "@/lib/api";
import { modelSetupPrompt } from "@/lib/prompts";
import { toast } from "sonner";
import type { ResearchProject } from "@/lib/types";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingLit, setIsLoadingLit] = useState(false);
  const [literatureContent, setLiteratureContent] = useState("");

  const project = state.currentProject;

  // Load project from localStorage on mount
  useEffect(() => {
    const id = params.id as string;
    const saved = localStorage.getItem("paperforge-projects");
    if (saved) {
      const projects: ResearchProject[] = JSON.parse(saved);
      const found = projects.find((p) => p.id === id);
      if (found) {
        dispatch({ type: "SET_PROJECT", payload: found });
      }
    }
  }, [params.id, dispatch]);

  // Save project changes
  useEffect(() => {
    if (project) {
      const saved = localStorage.getItem("paperforge-projects");
      if (saved) {
        const projects: ResearchProject[] = JSON.parse(saved);
        const idx = projects.findIndex((p) => p.id === project.id);
        if (idx >= 0) {
          projects[idx] = project;
          localStorage.setItem("paperforge-projects", JSON.stringify(projects));
        }
      }
    }
  }, [project]);

  const handleGenerate = useCallback(async () => {
    if (!project?.model || isGenerating) return;
    setIsGenerating(true);

    try {
      const sectionId = `model-setup-${Date.now()}`;
      let content = "";
      await chatStream(
        [{ role: "user", content: modelSetupPrompt(JSON.stringify(project.model, null, 2)) }],
        (text) => { content = text; }
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

      toast.success("Model Setup 章节已生成");

      setIsLoadingLit(true);
      const litContent = await fetchLiterature(project.model);
      setLiteratureContent(litContent);
      toast.success("文献推荐已加载");
    } catch (e) {
      console.error("Generation error", e);
      toast.error("生成失败", { description: "AI 服务暂时不可用" });
    } finally {
      setIsGenerating(false);
      setIsLoadingLit(false);
    }
  }, [project, isGenerating, dispatch]);

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
            <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="shrink-0">
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

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: AI analysis + Wizard */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-card/50 rounded-lg p-4 ring-1 ring-border">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                AI 分析结果
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {project.refinedIdea}
              </p>
            </div>

            <ModelWizard onComplete={() => undefined} />
          </div>

          {/* Right: Output */}
          <div className="lg:col-span-3 space-y-6">
            <ErrorBoundary>
              <OutputPanel
                sections={project.sections}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
              />
            </ErrorBoundary>

            {(literatureContent || isLoadingLit) && (
              <LiteraturePanel
                references={project.references}
                rawContent={literatureContent}
              />
            )}

            {isLoadingLit && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  正在搜索相关文献...
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
