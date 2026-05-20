"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ResearchWorkspace } from "@/components/research-workspace/research-workspace";
import { Button } from "@/components/ui/button";
import { fetchProject } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function ResearchProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [loadError, setLoadError] = useState(false);
  const id = params.id as string;
  const project =
    state.currentProject?.id === id ? state.currentProject : null;

  useEffect(() => {
    if (project) return;

    let cancelled = false;

    async function loadProject() {
      setLoadError(false);
      try {
        const found = await fetchProject(id);
        if (!cancelled) {
          dispatch({ type: "SET_PROJECT", payload: found });
        }
      } catch (error) {
        console.error("Failed to load research project", error);
        if (!cancelled) setLoadError(true);
        toast.error("研究加载失败");
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [dispatch, id, project]);

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6">
        <div className="max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <h1 className="font-serif text-xl font-semibold">研究加载失败</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            当前研究记录没有成功恢复。你可以返回启动页重新创建，或稍后再试。
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push("/launch")}>
              返回启动页
            </Button>
            <Button onClick={() => window.location.reload()}>重新加载</Button>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在恢复研究工作台
        </div>
      </main>
    );
  }

  return <ResearchWorkspace project={project} />;
}
