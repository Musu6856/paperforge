"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createExplorationProjectApi } from "@/lib/api";
import { getModelSourceMetadata, normalizeModelSourceSettings } from "@/lib/model-source";
import { createExplorationProject } from "@/lib/research-session";
import { useStore } from "@/lib/store";
import type { ModelSourceSettings } from "@/lib/types";

export function ResearchIdeaStep({
  settings,
  onBack,
}: {
  settings: ModelSourceSettings;
  onBack: () => void;
}) {
  const router = useRouter();
  const { dispatch } = useStore();
  const [idea, setIdea] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit() {
    const trimmedIdea = idea.trim();
    if (!trimmedIdea || isCreating) return;

    try {
      setIsCreating(true);
      const normalized = normalizeModelSourceSettings(settings);
      const project = createExplorationProject({
        rawIdea: trimmedIdea,
        modelSource: normalized,
      });
      project.modelSource = getModelSourceMetadata(normalized);

      const saved = await createExplorationProjectApi(project);
      dispatch({ type: "NEW_PROJECT", payload: saved });
      router.push(`/research/${saved.id}`);
    } catch (error) {
      console.error("Failed to create research session", error);
      toast.error("创建研究失败", {
        description:
          error instanceof Error ? error.message : "请稍后重试或检查模型配置。",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-4">
        <p className="text-sm leading-7 text-muted-foreground">
          不需要一次写完整模型。告诉 PaperForge 你想研究什么平台、什么机制、你直觉上关心什么冲突即可。
        </p>
        <Textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="例如：我想研究二手交易平台的收费和补贴策略。在闲鱼等平台上，卖家和买家存在交叉网络外部性，我想分析平台应该对谁收费、对谁补贴。"
          className="min-h-[240px] resize-none rounded-lg bg-background p-4 text-base leading-7 md:text-sm"
        />
        <div className="rounded-lg border bg-background p-4 text-sm leading-7 text-muted-foreground">
          <p className="font-medium text-foreground">这一版会先生成：</p>
          <p>4 个可建模研究方向、推荐方向、初始假设、效用函数框架和下一步决策问题。</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-8">
        <Button variant="outline" onClick={onBack} className="h-10 gap-2">
          <ArrowLeft className="size-4" />
          返回
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!idea.trim() || isCreating}
          className="h-10 gap-2 px-5"
        >
          {isCreating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              正在创建
            </>
          ) : (
            <>
              确认研究想法并开始生成
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
