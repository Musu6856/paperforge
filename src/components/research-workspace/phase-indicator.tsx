import type { ResearchSession } from "@/lib/types";

const PHASES: { id: ResearchSession["phase"]; label: string }[] = [
  { id: "direction", label: "方向发现" },
  { id: "model", label: "模型建立" },
  { id: "equilibrium", label: "均衡求解" },
  { id: "analysis", label: "性质分析" },
];

export function PhaseIndicator({ phase }: { phase: ResearchSession["phase"] }) {
  const activeIndex = PHASES.findIndex((item) => item.id === phase);

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto text-xs">
      {PHASES.map((item, index) => (
        <div key={item.id} className="flex shrink-0 items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-muted-foreground data-[active=true]:font-medium data-[active=true]:text-foreground"
            data-active={index === activeIndex}
          >
            {index === activeIndex && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
            {item.label}
          </span>
          {index < PHASES.length - 1 && (
            <span className="text-border-foreground text-muted-foreground/45">
              /
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
