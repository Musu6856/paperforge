import { auth } from "@clerk/nextjs/server";

const DEFAULT_BASE_URL = "https://api.xiaomimimo.com/v1";
const DEFAULT_MODEL = "mimo-v2.5-pro";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
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

function extractDelta(line: string) {
  if (!line.startsWith("data: ")) return "";

  const data = line.slice(6).trim();
  if (!data || data === "[DONE]") return "";

  try {
    const parsed = JSON.parse(data);
    return parsed.choices?.[0]?.delta?.content || "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "unauthorized");
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return jsonError("Invalid messages", 400, "invalid_messages");
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
        max_completion_tokens: 4096,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "你是一个博弈论研究助手，帮助研究者构建和撰写博弈论模型。用中文回复。使用 LaTeX 格式（$...$）表示数学符号。",
          },
          ...messages.map((message: ChatMessage) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
          })),
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return providerErrorResponse(upstream);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();
    let buffer = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const delta = extractDelta(line.trim());
              if (delta) controller.enqueue(encoder.encode(delta));
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
    console.error("Chat API error:", error);
    return jsonError("Internal server error", 500, "internal_error");
  }
}
