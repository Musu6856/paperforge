import {
  completeProviderChat,
  ProviderHttpError,
  type ProviderConfig,
} from "./provider.ts";

export type ProviderHealthCode =
  | "connected"
  | "missing_api_key"
  | "unsupported_provider"
  | "upstream_http_error"
  | "invalid_response"
  | "network_error";

export type ProviderHealthResult = {
  ok: boolean;
  configured: boolean;
  code: ProviderHealthCode;
  message: string;
  provider: {
    baseUrl: string;
    model: string;
  };
  latencyMs?: number;
  statusCode?: number;
};

type ProviderHealthClient = {
  fetch?: typeof fetch;
  now?: () => number;
  finalizeNow?: () => number;
  jsonMode?: boolean;
  unsupportedReason?: string;
};

const HEALTH_TIMEOUT_MS = 10000;

export async function checkProviderConnectivity(
  provider: ProviderConfig,
  client: ProviderHealthClient = {}
): Promise<ProviderHealthResult> {
  const safeProvider = {
    baseUrl: provider.baseUrl,
    model: provider.model,
  };

  if (client.unsupportedReason) {
    return {
      ok: false,
      configured: false,
      code: "unsupported_provider",
      message: client.unsupportedReason,
      provider: safeProvider,
    };
  }

  if (!provider.apiKey) {
    return {
      ok: false,
      configured: false,
      code: "missing_api_key",
      message:
        "服务端没有配置默认模型 API key。请检查 MIMO_API_KEY、OPENAI_COMPATIBLE_API_KEY、DEEPSEEK_API_KEY 或 OPENAI_API_KEY。",
      provider: safeProvider,
    };
  }

  const startedAt = client.now?.() ?? Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const content = await completeProviderChat(provider, {
      signal: controller.signal,
      fetch: client.fetch,
      maxCompletionTokens: 16,
      responseFormat: client.jsonMode ? "json_object" : undefined,
      messages: [
        {
          role: "system",
          content: client.jsonMode
            ? "Return JSON only: {\"ok\":true}."
            : "Return exactly pong.",
        },
        {
          role: "user",
          content: client.jsonMode ? "json ping" : "ping",
        },
      ],
    });
    const finishedAt = client.finalizeNow?.() ?? Date.now();

    if (!content || (client.jsonMode && !isValidJsonObject(content))) {
      return {
        ok: false,
        configured: true,
        code: "invalid_response",
        message: client.jsonMode
          ? "模型服务已响应，但 JSON 模式没有返回可解析对象。"
          : "模型服务已响应，但没有返回可读取的 assistant 内容。",
        provider: safeProvider,
        latencyMs: Math.max(0, finishedAt - startedAt),
      };
    }

    return {
      ok: true,
      configured: true,
      code: "connected",
      message: "默认模型连通正常。",
      provider: safeProvider,
      latencyMs: Math.max(0, finishedAt - startedAt),
    };
  } catch (error) {
    const finishedAt = client.finalizeNow?.() ?? Date.now();

    if (error instanceof ProviderHttpError) {
      return {
        ok: false,
        configured: true,
        code: "upstream_http_error",
        message: `模型服务返回 ${error.status} ${
          error.statusText || ""
        }`.trim(),
        provider: safeProvider,
        latencyMs: Math.max(0, finishedAt - startedAt),
        statusCode: error.status,
      };
    }

    return {
      ok: false,
      configured: true,
      code: "network_error",
      message:
        error instanceof DOMException && error.name === "AbortError"
          ? "模型连通检测超时。"
          : "模型连通检测请求失败。",
      provider: safeProvider,
      latencyMs: Math.max(0, finishedAt - startedAt),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isValidJsonObject(content: string) {
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}
