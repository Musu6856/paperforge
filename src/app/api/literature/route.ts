import Anthropic from "@anthropic-ai/sdk";
import { literaturePrompt } from "@/lib/prompts";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

function jsonError(error: string, status: number, code: string) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Anthropic({ apiKey });
}

function anthropicErrorResponse(error: unknown) {
  if (error instanceof Anthropic.APIError) {
    console.error("Anthropic API error:", {
      status: error.status,
      type: error.name,
      message: error.message,
    });

    if (error.status === 401) {
      return jsonError(
        "Anthropic authentication failed. Check ANTHROPIC_API_KEY in Vercel.",
        502,
        "anthropic_auth_failed"
      );
    }

    if (error.status === 429) {
      return jsonError(
        "Anthropic rate limit reached. Please try again later.",
        429,
        "anthropic_rate_limited"
      );
    }

    return jsonError(
      "Anthropic request failed. Check ANTHROPIC_MODEL and account access.",
      502,
      "anthropic_request_failed"
    );
  }

  console.error("Literature API error:", error);
  return jsonError("Internal server error", 500, "internal_error");
}

export async function POST(request: Request) {
  try {
    const { model } = await request.json();

    if (!model) {
      return new Response(JSON.stringify({ error: "Invalid model data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const anthropic = getAnthropicClient();

    if (!anthropic) {
      return jsonError(
        "AI service is not configured. Set ANTHROPIC_API_KEY in Vercel.",
        503,
        "missing_anthropic_api_key"
      );
    }

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: literaturePrompt(JSON.stringify(model, null, 2)),
        },
      ],
      system:
        "你是一个博弈论文献专家。用中文回复关联说明，论文标题用原文。",
    });

    const content =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    return new Response(JSON.stringify({ content }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return anthropicErrorResponse(error);
  }
}
