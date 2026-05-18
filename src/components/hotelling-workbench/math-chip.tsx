import type { SymbolDefinition } from "@/lib/types";

export function MathChip({ symbol }: { symbol: SymbolDefinition }) {
  return (
    <span
      className="inline-flex min-h-7 items-center rounded-md border bg-muted/40 px-2 font-mono text-sm leading-none text-foreground shadow-xs"
      title={`${symbol.name}: ${symbol.meaning}`}
    >
      <span>{symbol.baseSymbol}</span>
      {symbol.subscript ? (
        <sub className="ml-0.5 text-[0.65em] leading-none text-muted-foreground">
          {symbol.subscript}
        </sub>
      ) : null}
      {symbol.superscript ? (
        <sup className="ml-0.5 self-start pt-0.5 text-[0.65em] leading-none text-muted-foreground">
          {symbol.superscript}
        </sup>
      ) : null}
    </span>
  );
}
