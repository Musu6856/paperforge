import { AlertCircle, CheckCircle2, CircleDot } from "lucide-react";

import { MathArtifact } from "./math-artifact";
import type { ResearchSession } from "@/lib/types";

export function ResearchAssetsPanel({
  session,
}: {
  session: ResearchSession;
}) {
  const asset = session.assetSummary;

  return (
    <aside className="flex min-h-0 flex-col border-l bg-card lg:w-[340px]">
      <div className="border-b px-4 py-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Research Assets
        </p>
        <h2 className="mt-1 font-serif text-lg font-semibold">研究资产</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <AssetBlock title="当前研究方向">
          {asset.currentDirection ? (
            <div className="rounded-md border bg-background p-3">
              <p className="font-serif text-sm font-semibold">
                {asset.currentDirection.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {asset.currentDirection.model}
              </p>
            </div>
          ) : (
            <EmptyLine text="等待采用一个研究方向" />
          )}
        </AssetBlock>

        <AssetBlock title="已确认假设">
          {asset.confirmedAssumptions.length > 0 ? (
            <ol className="space-y-2">
              {asset.confirmedAssumptions.map((assumption, index) => (
                <li key={assumption} className="flex gap-2 text-xs leading-5">
                  <span className="font-mono font-semibold text-muted-foreground">
                    A{index + 1}.
                  </span>
                  <span>{assumption}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyLine text="采用方向后生成最小可求解假设" />
          )}
        </AssetBlock>

        <AssetBlock title="效用函数">
          {asset.utilityFunctions.length > 0 ? (
            <div className="space-y-2">
              {asset.utilityFunctions.map((formula) => (
                <MathArtifact key={formula} formula={formula} />
              ))}
            </div>
          ) : (
            <EmptyLine text="采用方向后展示候选效用函数" />
          )}
        </AssetBlock>

        <AssetBlock title="均衡求解状态">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-amber-100 px-2 py-1 text-xs text-amber-800">
            <CircleDot className="size-3" />
            {asset.equilibriumStatus === "not_started"
              ? "尚未开始"
              : asset.equilibriumStatus}
          </span>
        </AssetBlock>

        <AssetBlock title="待决策问题">
          {asset.pendingDecision ? (
            <div className="flex gap-2 rounded-md border bg-background p-3 text-xs leading-5">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{asset.pendingDecision.prompt}</span>
            </div>
          ) : (
            <EmptyLine text="暂无待决策问题" />
          )}
        </AssetBlock>

        <AssetBlock title="下一步操作">
          <div className="space-y-2">
            {asset.nextActions.map((action) => (
              <div key={action} className="flex gap-2 text-xs leading-5">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </AssetBlock>
      </div>
    </aside>
  );
}

function AssetBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed bg-background/60 px-3 py-3 text-xs text-muted-foreground">
      {text}
    </div>
  );
}
