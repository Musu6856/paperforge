import Anthropic from "@anthropic-ai/sdk";

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

  console.error("Chat API error:", error);
  return jsonError("Internal server error", 500, "internal_error");
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
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

    const stream = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 4096,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      system:
        "你是一个博弈论研究助手，帮助研究者构建和撰写博弈论模型。用中文回复。使用 LaTeX 格式（$...$）表示数学符号。",
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return anthropicErrorResponse(error);
  }
}
