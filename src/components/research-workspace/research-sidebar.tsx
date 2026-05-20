"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { ResearchProject } from "@/lib/types";

export function ResearchSidebar({ project }: { project: ResearchProject }) {
  const { state } = useStore();
  const formalProjects = state.projects.filter(
    (item) => item.projectType === "formal"
  );
  const explorationProjects = state.projects.filter(
    (item) => item.projectType === "exploration"
  );

  return (
    <aside className="hidden min-h-0 border-r bg-muted/45 lg:flex lg:w-[260px] lg:flex-col">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/" className="font-serif text-base font-semibold">
          PaperForge
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/launch" />}
          title="新研究"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <NavSection
          title="正式项目"
          projects={formalProjects}
          activeId={project.id}
        />
        <NavSection
          title="探索记录"
          projects={explorationProjects}
          activeId={project.id}
        />
      </div>
    </aside>
  );
}

function NavSection({
  title,
  projects,
  activeId,
}: {
  title: string;
  projects: ResearchProject[];
  activeId: string;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-1">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/research/${project.id}`}
              className="block rounded-md px-2.5 py-2 text-sm leading-5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground data-[active=true]:border data-[active=true]:bg-card data-[active=true]:font-medium data-[active=true]:text-foreground data-[active=true]:shadow-sm"
              data-active={project.id === activeId}
            >
              <span className="line-clamp-2">{project.refinedIdea || project.rawIdea}</span>
            </Link>
          ))
        ) : (
          <p className="px-2.5 py-2 text-xs leading-5 text-muted-foreground">
            暂无记录
          </p>
        )}
      </div>
    </section>
  );
}
