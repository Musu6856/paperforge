"use client";

import { ArrowRight, KeyRound, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MODEL_SOURCE_STORAGE_KEY,
  normalizeModelSourceSettings,
} from "@/lib/model-source";
import type { ModelSourceProvider, ModelSourceSettings } from "@/lib/types";

const PROVIDERS: { value: ModelSourceProvider; label: string; hint: string }[] = [
  {
    value: "openai",
    label: "OpenAI",
    hint: "使用 OpenAI 官方接口格式",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    hint: "使用 Anthropic Messages 接口格式",
  },
  {
    value: "openai-compatible",
    label: "OpenAI-compatible",
    hint: "DeepSeek、Qwen 等常见兼容接口",
  },
  {
    value: "anthropic-compatible",
    label: "Anthropic-compatible",
    hint: "Anthropic 格式兼容服务",
  },
];

type OwnSettings = Extract<ModelSourceSettings, { source: "own" }>;

export function ModelSourceStep({
  settings,
  onSettingsChange,
  onNext,
}: {
  settings: ModelSourceSettings;
  onSettingsChange: (settings: ModelSourceSettings) => void;
  onNext: () => void;
}) {
  const ownSettings: OwnSettings =
    settings.source === "own"
      ? settings
      : {
          source: "own",
          provider: "openai-compatible",
          apiKey: "",
          model: "",
          baseUrl: "",
        };

  function updateOwn(patch: Partial<OwnSettings>) {
    onSettingsChange({ ...ownSettings, ...patch });
  }

  function handleNext() {
    try {
      const normalized = normalizeModelSourceSettings(settings);
      window.localStorage.setItem(
        MODEL_SOURCE_STORAGE_KEY,
        JSON.stringify(normalized)
      );
      onSettingsChange(normalized);
      onNext();
    } catch (error) {
      toast.error("请补全模型来源配置", {
        description:
          error instanceof Error ? error.message : "当前配置无法用于生成研究。",
      });
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSettingsChange({ source: "paperforge" })}
          className="flex w-full items-start gap-4 rounded-lg border bg-background p-5 text-left transition-colors hover:border-primary/60 data-[active=true]:border-primary data-[active=true]:bg-accent/55"
          data-active={settings.source === "paperforge"}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <KeyRound className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold">
              使用 PaperForge 提供的模型
            </span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">
              适合先试用完整流程。第一版不接入真实收费，只用于生成研究方向和模型草案。
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSettingsChange(ownSettings)}
          className="flex w-full items-start gap-4 rounded-lg border bg-background p-5 text-left transition-colors hover:border-primary/60 data-[active=true]:border-primary data-[active=true]:bg-accent/55"
          data-active={settings.source === "own"}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
            <LockKeyhole className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold">使用自己的模型</span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">
              API key 只保存在当前浏览器。服务端仅保存供应商、模型名和是否配置 key 的脱敏信息。
            </span>
          </span>
        </button>
      </div>

      {settings.source === "own" && (
        <div className="mt-6 space-y-5 rounded-lg border bg-background p-5">
          <div>
            <Label>服务商格式</Label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.value}
                  type="button"
                  onClick={() => updateOwn({ provider: provider.value })}
                  className="rounded-md border px-3 py-3 text-left text-sm transition-colors hover:border-primary/60 data-[active=true]:border-primary data-[active=true]:bg-accent/55"
                  data-active={ownSettings.provider === provider.value}
                >
                  <span className="block font-medium">{provider.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {provider.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Field label="模型名称">
            <Input
              value={ownSettings.model}
              onChange={(event) => updateOwn({ model: event.target.value })}
              placeholder="例如 gpt-5.2、claude-sonnet-4-5、deepseek-chat"
              className="h-10"
            />
          </Field>

          {(ownSettings.provider === "openai-compatible" ||
            ownSettings.provider === "anthropic-compatible") && (
            <Field label="Base URL">
              <Input
                value={ownSettings.baseUrl ?? ""}
                onChange={(event) => updateOwn({ baseUrl: event.target.value })}
                placeholder="例如 https://api.deepseek.com/v1"
                className="h-10"
              />
            </Field>
          )}

          <Field label="API Key">
            <Input
              type="password"
              value={ownSettings.apiKey}
              onChange={(event) => updateOwn({ apiKey: event.target.value })}
              placeholder="只保存在当前浏览器"
              className="h-10"
            />
          </Field>
        </div>
      )}

      <div className="mt-auto flex justify-end pt-8">
        <Button onClick={handleNext} className="h-10 gap-2 px-5">
          继续
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
