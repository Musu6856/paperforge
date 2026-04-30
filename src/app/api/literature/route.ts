import { auth } from "@clerk/nextjs/server";
import { literaturePrompt } from "@/lib/prompts";

const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";
const DEFAULT_MODEL = "mimo-v2.5-pro";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function jsonError(error: string, status: number, code: string) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getProviderConfig() {
  return {
    apiKey:
      process.env.XIAOMI_API_KEY ||
      process.env.MIMO_API_KEY ||
      process.env.ANTHROPIC_API_KEY,
    baseUrl: process.env.XIAOMI_BASE_URL || process.env.MIMO_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.XIAOMI_MODEL || process.env.MIMO_MODEL || DEFAULT_MODEL,
  };
}

async function providerErrorResponse(response: Response) {
  const body = await response.text();
  console.error("Xiaomi MiMo API error:", {
    status: response.status,
    statusText: response.statusText,
    body,
  });

  if (response.status === 401 || response.status === 403) {
    return jsonError(
      "Xiaomi MiMo authentication failed. Check your API key in Vercel.",
      502,
      "mimo_auth_failed"
    );
  }

  if (response.status === 429) {
    return jsonError(
      "Xiaomi MiMo rate limit reached. Please try again later.",
      429,
      "mimo_rate_limited"
    );
  }

  return jsonError(
    "Xiaomi MiMo request failed. Check XIAOMI_MODEL and account access.",
    502,
    "mimo_request_failed"
  );
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const { model } = await request.json();

    if (!model) {
      return jsonError("Invalid model data", 400, "invalid_model_data");
    }

    const provider = getProviderConfig();

    if (!provider.apiKey) {
      return jsonError(
        "AI service is not configured. Set XIAOMI_API_KEY in Vercel.",
        503,
        "missing_mimo_api_key"
      );
    }

    const upstream = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "api-key": provider.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        max_completion_tokens: 2048,
        stream: false,
        messages: [
          {
            role: "system",
            content: "你是一个博弈论文献专家。用中文回复关联说明，论文标题用原文。",
          },
          {
            role: "user",
            content: literaturePrompt(JSON.stringify(model, null, 2)),
          },
        ],
      }),
    });

    if (!upstream.ok) {
      return providerErrorResponse(upstream);
    }

    const data = (await upstream.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Literature API error:", error);
    return jsonError("Internal server error", 500, "internal_error");
  }
}
