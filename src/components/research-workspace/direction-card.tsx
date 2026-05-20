import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResearchDirection } from "@/lib/types";

export function DirectionCard({
  direction,
  adopted,
  onAdopt,
}: {
  direction: ResearchDirection;
  adopted: boolean;
  onAdopt: (directionId: string) => void;
}) {
  return (
    <article
      className="flex min-w-0 flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/60 data-[adopted=true]:border-primary data-[adopted=true]:bg-accent/55"
      data-adopted={adopted}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-base font-semibold leading-6">
          {direction.title}
        </h3>
        {direction.recommended && (
          <Badge variant="secondary" className="shrink-0">
            推荐
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {direction.summary}
      </p>
      <div className="mt-4 space-y-2 text-xs leading-5">
        <p>
          <span className="font-medium text-foreground">模型：</span>
          <span className="text-muted-foreground">{direction.model}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">贡献：</span>
          <span className="text-muted-foreground">{direction.contribution}</span>
        </p>
      </div>
      <div className="mt-4 flex justify-end">
        {adopted ? (
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <CheckCircle2 className="size-3.5" />
            已采用
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onAdopt(direction.id)}
          >
            采用此方向
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}
