import type {
  ModelSourceMetadata,
  ModelSourceProvider,
  ModelSourceSettings,
} from "./types";

export const MODEL_SOURCE_STORAGE_KEY = "paperforge:model-source:v1";

const COMPATIBLE_PROVIDERS = new Set<ModelSourceProvider>([
  "openai-compatible",
  "anthropic-compatible",
]);

export function normalizeModelSourceSettings(
  value: Partial<ModelSourceSettings> | null | undefined
): ModelSourceSettings {
  const input = (value ?? {}) as Partial<OwnModelSourceInput>;
  const source = input.source ?? "paperforge";

  if (source !== "paperforge" && source !== "own") {
    throw new Error("Unknown model source.");
  }

  if (source === "paperforge") {
    return { source };
  }

  const provider = input.provider;
  if (!provider || !isModelSourceProvider(provider)) {
    throw new Error("Model provider is required for own model source.");
  }
  const apiKey = trimOptional(input.apiKey);
  if (!apiKey) {
    throw new Error("API key is required for own model source.");
  }
  const model = trimOptional(input.model);
  if (!model) {
    throw new Error("Model is required for own model source.");
  }

  const normalized: ModelSourceSettings = {
    source,
    provider,
    apiKey,
    model,
  };
  const baseUrl = trimEndpoint(input.baseUrl);

  if (COMPATIBLE_PROVIDERS.has(provider)) {
    if (!baseUrl) {
      throw new Error("Base URL is required for compatible model provider.");
    }
    normalized.baseUrl = baseUrl;
  } else if (baseUrl) {
    normalized.baseUrl = baseUrl;
  }

  return normalized;
}

type OwnModelSourceInput = {
  source: string;
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

export function getModelSourceMetadata(
  settings: ModelSourceSettings
): ModelSourceMetadata {
  const normalized = normalizeModelSourceSettings(settings);

  if (normalized.source === "paperforge") {
    return { source: "paperforge" };
  }

  const metadata: ModelSourceMetadata = {
    source: "own",
    provider: normalized.provider,
    model: normalized.model,
    hasBrowserApiKey: true,
  };

  if (normalized.baseUrl) metadata.baseUrl = normalized.baseUrl;

  return metadata;
}

function isModelSourceProvider(value: string): value is ModelSourceProvider {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "openai-compatible" ||
    value === "anthropic-compatible"
  );
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimEndpoint(value: unknown): string | undefined {
  const trimmed = trimOptional(value);
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
}
