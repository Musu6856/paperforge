import { auth } from "@clerk/nextjs/server";
import { literaturePrompt } from "@/lib/prompts";
import {
  getProviderConfig,
  jsonError,
  providerErrorResponse,
} from "@/lib/provider";
import { checkRateLimit } from "@/lib/rate-limit";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const limit = checkRateLimit(userId);
    if (!limit.ok) {
      return jsonError(
        `Too many requests. Try again in ${limit.retryAfter}s.`,
        429,
        "rate_limited"
      );
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
