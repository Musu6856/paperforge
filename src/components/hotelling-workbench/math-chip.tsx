import type { SymbolDefinition } from "@/lib/types";

export function MathChip({ symbol }: { symbol: SymbolDefinition }) {
  return (
    <span
      className="inline-flex min-h-7 items-center rounded-md border bg-muted/40 px-2 font-mono text-sm leading-none text-foreground shadow-xs"
      title={`${symbol.name}: ${symbol.meaning}`}
      aria-label={`${symbol.name || symbol.baseSymbol}: ${
        symbol.meaning || symbol.symbol
      }`}
    >
      <span>{symbol.baseSymbol}</span>
      {symbol.subscript || symbol.superscript ? (
        <span className="ml-0.5 grid h-5 grid-rows-2 items-center self-center text-[0.62em] leading-none text-muted-foreground">
          <span className="block h-2.5 leading-none">
            {symbol.superscript ? symbol.superscript : "\u00a0"}
          </span>
          <span className="block h-2.5 leading-none">
            {symbol.subscript ? symbol.subscript : "\u00a0"}
          </span>
        </span>
      ) : null}
    </span>
  );
}
