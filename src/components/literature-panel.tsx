"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import type { Reference } from "@/lib/types";

interface LiteraturePanelProps {
  references: Reference[];
  rawContent?: string;
}

export function LiteraturePanel({ references, rawContent }: LiteraturePanelProps) {
  if (!rawContent && references.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium">参考文献推荐</h2>
      </div>

      <Card className="ring-1 ring-border">
        <CardContent className="p-5">
          {rawContent ? (
            <div className="prose-academic text-sm">
              <MarkdownRenderer content={rawContent} />
            </div>
          ) : (
            references.map((ref, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2.5 not-last:border-b not-last:border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ref.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ref.authors} ({ref.year})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {ref.relevance}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {ref.category === "foundational" ? "基础" : ref.category === "two-sided" ? "双边平台" : "方法论"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
