"use client";

import { Check, X } from "lucide-react";

import type { ResearchAssetChange, ResearchAssetPatch } from "@/lib/types";

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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{patch.summary}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {getPatchSummaryLine(patch)}
                </div>
              </div>
              <span className="shrink-0 rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {getPatchKindLabel(patch.kind)}
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
                      {getChangeKindLabel(change.kind)}
                    </span>
                    <span className="min-w-0 break-all font-mono text-foreground">
                      {formatPatchPath(change.path)}
                    </span>
                  </div>
                  {formatPatchValuePreview(change) ? (
                    <div className="mt-1 break-words font-mono text-[11px] text-foreground">
                      {formatPatchValuePreview(change)}
                    </div>
                  ) : null}
                  {change.note ? (
                    <div className="mt-1 break-words">{change.note}</div>
                  ) : null}
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

function getPatchSummaryLine(patch: ResearchAssetPatch) {
  const count = patch.changes.length;
  if (patch.kind === "model") {
    const symbolEdits = patch.changes.filter((change) =>
      change.path.includes("symbols")
    ).length;
    const assumptionEdits = patch.changes.filter((change) =>
      change.path.includes("assumptions")
    ).length;
    const parts = [
      symbolEdits > 0 ? `${symbolEdits} symbol edit${symbolEdits === 1 ? "" : "s"}` : "",
      assumptionEdits > 0
        ? `${assumptionEdits} assumption edit${assumptionEdits === 1 ? "" : "s"}`
        : "",
    ].filter(Boolean);
    return parts.length > 0
      ? `Model patch: ${parts.join(", ")}`
      : `Model patch: ${count} change${count === 1 ? "" : "s"}`;
  }

  return `${getPatchKindLabel(patch.kind)} patch: ${count} change${count === 1 ? "" : "s"}`;
}

function getPatchKindLabel(kind: ResearchAssetPatch["kind"]) {
  switch (kind) {
    case "model":
      return "Model";
    case "equilibrium":
      return "Equilibrium";
    case "properties":
      return "Properties";
  }
}

function getChangeKindLabel(kind: ResearchAssetChange["kind"]) {
  switch (kind) {
    case "append":
      return "add";
    case "replace":
      return "edit";
    case "remove":
      return "remove";
  }
}

function formatPatchPath(path: string) {
  return path
    .replace(/^hotellingModel\./, "")
    .replace(/^equilibriumResult\./, "")
    .replace(/^propertyAnalyses\./, "properties.");
}

function formatPatchValuePreview(change: ResearchAssetChange) {
  if (change.kind === "remove" || change.value === undefined) return "";
  if (typeof change.value === "string") return `-> ${change.value}`;
  if (isRecord(change.value)) {
    const symbol = typeof change.value.symbol === "string" ? change.value.symbol : "";
    const name = typeof change.value.name === "string" ? change.value.name : "";
    return [symbol, name].filter(Boolean).join(" - ");
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
