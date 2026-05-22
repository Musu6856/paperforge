"use client";

import { Check, X } from "lucide-react";

import type { ResearchAssetPatch } from "@/lib/types";

type PendingAssetPatchesProps = {
  patches: ResearchAssetPatch[];
  onApply?: (patchId: string) => void;
  onReject?: (patchId: string) => void;
};

export function PendingAssetPatches({
  patches,
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
            <div className="text-sm font-medium">{patch.summary}</div>
            <div className="mt-2 space-y-1">
              {patch.changes.map((change) => (
                <div key={`${patch.id}-${change.path}`} className="text-xs leading-5 text-muted-foreground">
                  <span className="font-mono text-foreground">{change.path}</span>
                  {change.note ? `: ${change.note}` : ""}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
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
