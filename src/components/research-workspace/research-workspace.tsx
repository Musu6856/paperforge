"use client";

import { useState } from "react";
import { SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { MentorFeed } from "./mentor-feed";
import { PhaseIndicator } from "./phase-indicator";
import { ResearchAssetsPanel } from "./research-assets-panel";
import { ResearchSidebar } from "./research-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveProject } from "@/lib/api";
import { adoptResearchDirection, createInitialResearchSession } from "@/lib/research-session";
import { useStore } from "@/lib/store";
import type { ResearchProject } from "@/lib/types";

export function ResearchWorkspace({ project }: { project: ResearchProject }) {
  const { dispatch } = useStore();
  const [draft, setDraft] = useState("");
  const session =
    project.researchSession ?? createInitialResearchSession(project.rawIdea);

  async function handleAdopt(directionId: string) {
    try {
      const nextProject = adoptResearchDirection(project, directionId);
      dispatch({ type: "SET_PROJECT", payload: nextProject });
      await saveProject(nextProject);
      toast.success("已采用方向，进入模型建立阶段");
    } catch (error) {
      console.error("Failed to adopt direction", error);
      toast.error("采用方向失败");
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)_340px]">
      <ResearchSidebar project={project} />

      <main className="flex min-h-0 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {project.refinedIdea || project.rawIdea}
            </p>
          </div>
          <PhaseIndicator phase={session.phase} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8">
          <MentorFeed project={project} session={session} onAdopt={handleAdopt} />
        </div>

        <div className="border-t bg-background px-5 py-4">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-lg border bg-card p-1 shadow-sm">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="例如：假设平台只向卖家收取交易分成，对买家免费..."
              className="h-10 border-0 focus-visible:ring-0"
            />
            <Button
              size="icon"
              disabled={!draft.trim()}
              onClick={() => {
                toast.info("模型共创对话将在下一版接入真实生成");
                setDraft("");
              }}
            >
              <SendHorizontal className="size-4" />
            </Button>
          </div>
        </div>
      </main>

      <ResearchAssetsPanel session={session} />
    </div>
  );
}
