"use client";

import { Check, Eye, X } from "lucide-react";

import type { ResearchAssetPatch } from "@/lib/types";
import {
  describeResearchAssetChange,
  formatPatchPath,
  getResearchAssetChangeKindLabel,
  getResearchAssetKindLabel,
  getResearchAssetPatchSummaryLine,
} from "@/lib/research-asset-patch-display";

type PendingAssetPatchesProps = {
  patches: ResearchAssetPatch[];
  onReview?: (patchId: string) => void;
  onApply?: (patchId: string) => void;
  onReject?: (patchId: string) => void;
};

export function PendingAssetPatches({
  patches,
  onReview,
  onApply,
  onReject,
}: PendingAssetPatchesProps) {
  const proposed = patches.filter((patch) => patch.status === "proposed");

  if (proposed.length === 0) return null;

  return (
    <section className="border-b bg-muted/30 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">待应用修改</div>
      <div className="space-y-2">
        {proposed.map((patch) => (
          <article key={patch.id} className="rounded-md border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{patch.summary}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {getResearchAssetPatchSummaryLine(patch)}
                </div>
              </div>
              <span className="shrink-0 rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {getResearchAssetKindLabel(patch.kind)}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {patch.changes.map((change, index) => (
                <div
                  key={`${patch.id}-${index}-${change.kind}-${change.path}`}
                  className="rounded-sm bg-muted/45 px-2 py-1.5 text-xs leading-5 text-muted-foreground"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="rounded-sm border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {getResearchAssetChangeKindLabel(change.kind)}
                    </span>
                    <span className="min-w-0 break-words text-foreground">
                      {describeResearchAssetChange(change, patch.kind)}
                    </span>
                  </div>
                  <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                    {formatPatchPath(change.path)}
                  </div>
                  {change.note ? (
                    <div className="mt-1 break-words">{change.note}</div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
                disabled={!onReview}
                onClick={() => onReview?.(patch.id)}
              >
                <Eye size={14} />
                查看
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                disabled={!onApply}
                onClick={() => onApply?.(patch.id)}
              >
                <Check size={14} />
                应用
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50"
                disabled={!onReject}
                onClick={() => onReject?.(patch.id)}
              >
                <X size={14} />
                拒绝
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
