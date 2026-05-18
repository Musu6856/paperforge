"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { LiteratureAnalysis, ResearchProject } from "@/lib/types";

const ANALYSIS_FIELDS: Array<{
  key: keyof Pick<
    LiteratureAnalysis,
    | "researchQuestion"
    | "modelStructure"
    | "timing"
    | "utilityDesign"
    | "equilibriumMethod"
  >;
  label: string;
}> = [
  { key: "researchQuestion", label: "问题" },
  { key: "modelStructure", label: "结构" },
  { key: "timing", label: "时序" },
  { key: "utilityDesign", label: "效用" },
  { key: "equilibriumMethod", label: "均衡" },
];

export function LiteratureStep({ project }: { project: ResearchProject }) {
  const { dispatch } = useStore();
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const analyses = project.literatureAnalyses ?? [];

  function addAnalysis() {
    const cleanTitle = title.trim();
    const cleanSourceText = sourceText.trim();
    if (!cleanTitle && !cleanSourceText) return;

    const nextAnalysis: LiteratureAnalysis = {
      id: crypto.randomUUID(),
      title: cleanTitle || "未命名文献",
      sourceText: cleanSourceText,
      researchQuestion: "",
      modelStructure: "",
      timing: "",
      utilityDesign: "",
      equilibriumMethod: "",
      borrowableIdeas: [],
      differentiationPoints: [],
    };

    dispatch({
      type: "SET_LITERATURE_ANALYSES",
      payload: [...analyses, nextAnalysis],
    });
    setTitle("");
    setSourceText("");
  }

  function deleteAnalysis(id: string) {
    dispatch({
      type: "SET_LITERATURE_ANALYSES",
      payload: analyses.filter((analysis) => analysis.id !== id),
    });
  }

  return (
    <section className="flex min-h-[520px] min-w-0 flex-col gap-4">
      <header className="border-b pb-3">
        <p className="text-xs font-medium text-muted-foreground">文献启发</p>
        <h3 className="mt-1 break-words text-base font-semibold">
          文献导入与拆解
        </h3>
      </header>

      <div className="grid min-w-0 gap-3 border-b pb-4">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="literature-title" className="text-xs">
            标题
          </Label>
          <Input
            id="literature-title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="论文标题、作者或短标签"
            className="text-sm"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="literature-source" className="text-xs">
            原文/摘要/笔记
          </Label>
          <Textarea
            id="literature-source"
            value={sourceText}
            onChange={(event) => setSourceText(event.currentTarget.value)}
            rows={5}
            placeholder="粘贴摘要、模型段落或自己的阅读笔记。"
            className="min-h-28 resize-y text-sm leading-6"
          />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={addAnalysis}>
            添加文献
          </Button>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            已导入 {analyses.length} 篇
          </p>
        </div>

        {analyses.length === 0 ? (
          <p className="border-l border-dashed pl-3 text-sm leading-6 text-muted-foreground">
            暂无文献。先导入一段摘要或模型笔记，再逐步补全可借鉴思路与差异化切入点。
          </p>
        ) : (
          <div className="min-w-0 divide-y rounded-lg border">
            {analyses.map((analysis) => (
              <article key={analysis.id} className="min-w-0 space-y-2 p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-words text-sm font-medium leading-5">
                      {analysis.title || "未命名文献"}
                    </h4>
                    <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
                      {analysis.sourceText || "暂无原文片段"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => deleteAnalysis(analysis.id)}
                  >
                    删除
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {ANALYSIS_FIELDS.map((field) => (
                    <Badge
                      key={field.key}
                      variant={analysis[field.key] ? "secondary" : "outline"}
                    >
                      {field.label}
                      {analysis[field.key] ? "已填" : "空"}
                    </Badge>
                  ))}
                  <Badge
                    variant={
                      analysis.borrowableIdeas.length ? "secondary" : "outline"
                    }
                  >
                    可借鉴 {analysis.borrowableIdeas.length}
                  </Badge>
                  <Badge
                    variant={
                      analysis.differentiationPoints.length
                        ? "secondary"
                        : "outline"
                    }
                  >
                    差异化 {analysis.differentiationPoints.length}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
