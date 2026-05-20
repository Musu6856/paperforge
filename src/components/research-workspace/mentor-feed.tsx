import { DirectionCard } from "./direction-card";
import type { ResearchProject, ResearchSession } from "@/lib/types";

export function MentorFeed({
  project,
  session,
  onAdopt,
}: {
  project: ResearchProject;
  session: ResearchSession;
  onAdopt: (directionId: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <Message role="user" content={project.rawIdea} />
      <Message
        role="assistant"
        content={
          session.messages.find((message) => message.role === "assistant")
            ?.content ??
          "我先把你的想法拆成几个可建模方向，再一起选择最适合符号推导的路线。"
        }
      >
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {session.directions.map((direction) => (
            <DirectionCard
              key={direction.id}
              direction={direction}
              adopted={session.assetSummary.currentDirection?.id === direction.id}
              onAdopt={onAdopt}
            />
          ))}
        </div>
      </Message>

      {session.phase !== "direction" && (
        <Message
          role="assistant"
          content={
            session.assetSummary.pendingDecision?.prompt ??
            "方向已经确定。下一步是继续确认模型变量、效用函数和可求解条件。"
          }
        />
      )}
    </div>
  );
}

function Message({
  role,
  content,
  children,
}: {
  role: "user" | "assistant";
  content: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold data-[role=assistant]:bg-foreground data-[role=assistant]:font-serif data-[role=assistant]:text-background data-[role=user]:bg-border data-[role=user]:text-foreground"
        data-role={role}
      >
        {role === "assistant" ? "P" : "U"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-7 text-foreground">{content}</p>
        {children}
      </div>
    </div>
  );
}
