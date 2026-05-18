"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SymbolDefinition, SymbolRole, SymbolSide } from "@/lib/types";
import { MathChip } from "./math-chip";

const ROLE_OPTIONS: Array<{ value: SymbolRole; label: string }> = [
  { value: "parameter", label: "Parameter" },
  { value: "decision", label: "Decision variable" },
  { value: "demand", label: "Demand variable" },
  { value: "utility", label: "Utility component" },
  { value: "cost", label: "Cost parameter" },
  { value: "derived", label: "Derived variable" },
];

const SIDE_OPTIONS: Array<{ value: SymbolSide; label: string }> = [
  { value: "platform", label: "Platform" },
  { value: "consumer", label: "Consumer side" },
  { value: "merchant", label: "Merchant side" },
  { value: "both", label: "Both sides" },
  { value: "global", label: "Global" },
];

function toDisplaySymbol(symbol: Pick<SymbolDefinition, "baseSymbol" | "subscript" | "superscript">) {
  const base = symbol.baseSymbol.trim() || "x";
  const subscript = symbol.subscript?.trim();
  const superscript = symbol.superscript?.trim();

  return `${base}${subscript ? `_${subscript}` : ""}${
    superscript ? `^${superscript}` : ""
  }`;
}

function toCodeName(symbol: Pick<SymbolDefinition, "baseSymbol" | "subscript" | "superscript">) {
  return [symbol.baseSymbol, symbol.subscript, symbol.superscript]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("_")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function SymbolEditor({
  symbol,
  onChange,
}: {
  symbol: SymbolDefinition;
  onChange: (symbol: SymbolDefinition) => void;
}) {
  function update<K extends keyof SymbolDefinition>(
    key: K,
    value: SymbolDefinition[K]
  ) {
    const nextSymbol = {
      ...symbol,
      [key]: value,
    };

    if (
      key === "baseSymbol" ||
      key === "subscript" ||
      key === "superscript"
    ) {
      nextSymbol.symbol = toDisplaySymbol(nextSymbol);
      if (!symbol.codeName.trim() || symbol.codeName === toCodeName(symbol)) {
        nextSymbol.codeName = toCodeName(nextSymbol);
      }
    }

    onChange(nextSymbol);
  }

  const previewSymbol = {
    ...symbol,
    symbol: toDisplaySymbol(symbol),
    baseSymbol: symbol.baseSymbol.trim() || "x",
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3 border-b pb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
            Preview
          </p>
          <div className="mt-1">
            <MathChip symbol={previewSymbol} />
          </div>
        </div>
        <p className="min-w-0 flex-1 break-words text-xs leading-5 text-muted-foreground">
          Use lower and upper indices for side-specific notation such as n_i^C
          and n_i^M; keep the code name SymPy-safe.
        </p>
      </div>

      <div className="grid min-w-0 gap-2 md:grid-cols-4">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${symbol.id}-baseSymbol`} className="text-xs">
            Base
          </Label>
          <Input
            id={`${symbol.id}-baseSymbol`}
            value={symbol.baseSymbol}
            onChange={(event) =>
              update("baseSymbol", event.currentTarget.value)
            }
            placeholder="n"
            className="text-sm"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${symbol.id}-subscript`} className="text-xs">
            Subscript
          </Label>
          <Input
            id={`${symbol.id}-subscript`}
            value={symbol.subscript ?? ""}
            onChange={(event) => update("subscript", event.currentTarget.value)}
            placeholder="i"
            className="text-sm"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${symbol.id}-superscript`} className="text-xs">
            Superscript
          </Label>
          <Input
            id={`${symbol.id}-superscript`}
            value={symbol.superscript ?? ""}
            onChange={(event) =>
              update("superscript", event.currentTarget.value)
            }
            placeholder="C"
            className="text-sm"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${symbol.id}-codeName`} className="text-xs">
            Code name
          </Label>
          <Input
            id={`${symbol.id}-codeName`}
            value={symbol.codeName}
            onChange={(event) => update("codeName", event.currentTarget.value)}
            placeholder="n_i_C"
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${symbol.id}-name`} className="text-xs">
            Name
          </Label>
          <Input
            id={`${symbol.id}-name`}
            value={symbol.name}
            onChange={(event) => update("name", event.currentTarget.value)}
            placeholder="Consumer demand"
            className="text-sm"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${symbol.id}-assumption`} className="text-xs">
            Assumption
          </Label>
          <Input
            id={`${symbol.id}-assumption`}
            value={symbol.assumption}
            onChange={(event) =>
              update("assumption", event.currentTarget.value)
            }
            placeholder="positive, nonnegative, real, bounded in [0,1]"
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${symbol.id}-role`} className="text-xs">
            Role
          </Label>
          <select
            id={`${symbol.id}-role`}
            value={symbol.role}
            onChange={(event) =>
              update("role", event.currentTarget.value as SymbolRole)
            }
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={`${symbol.id}-side`} className="text-xs">
            Side
          </Label>
          <select
            id={`${symbol.id}-side`}
            value={symbol.side}
            onChange={(event) =>
              update("side", event.currentTarget.value as SymbolSide)
            }
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {SIDE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor={`${symbol.id}-meaning`} className="text-xs">
          Meaning
        </Label>
        <Textarea
          id={`${symbol.id}-meaning`}
          value={symbol.meaning}
          onChange={(event) => update("meaning", event.currentTarget.value)}
          rows={2}
          placeholder="Mass of consumers choosing platform i."
          className="min-h-16 resize-y text-sm leading-5"
        />
      </div>
    </div>
  );
}
