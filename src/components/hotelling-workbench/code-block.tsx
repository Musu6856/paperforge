"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const trimmedCode = code.trim();
  const hasCode = trimmedCode.length > 0;

  async function copyCode() {
    if (!hasCode) {
      return;
    }

    await navigator.clipboard.writeText(trimmedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex min-h-9 items-center justify-between gap-3 border-b bg-muted/45 px-3">
        <span className="text-xs font-medium text-muted-foreground">
          可复用代码
        </span>
        <button
          type="button"
          onClick={copyCode}
          disabled={!hasCode}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={copied ? "已复制代码" : "复制代码"}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      {hasCode ? (
        <pre className="max-h-[420px] overflow-auto p-3 text-xs leading-5 text-foreground">
          <code>{trimmedCode}</code>
        </pre>
      ) : (
        <div className="flex min-h-32 items-center px-3 py-6 text-sm text-muted-foreground">
          生成均衡后会显示可复用代码
        </div>
      )}
    </div>
  );
}
