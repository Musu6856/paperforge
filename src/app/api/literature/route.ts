import Anthropic from "@anthropic-ai/sdk";
import { literaturePrompt } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { model } = await request.json();

    if (!model) {
      return new Response(JSON.stringify({ error: "Invalid model data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
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
    console.error("Literature API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
