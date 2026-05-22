"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ResearchWorkspace } from "@/components/research-workspace/research-workspace";
import { getResearchIndexDestination } from "@/lib/research-routing";
import { useStore } from "@/lib/store";

export default function ResearchIndexPage() {
  const router = useRouter();
  const { state } = useStore();

  useEffect(() => {
    if (state.isLoading) return;

    const destination = getResearchIndexDestination(state.projects);
    if (destination) {
      router.replace(destination);
    }
  }, [router, state.isLoading, state.projects]);

  if (!state.isLoading && state.projects.length === 0) {
    return <ResearchWorkspace />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      正在进入研究工作台
    </main>
  );
}
