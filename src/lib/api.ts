import type { GameTheoryModel } from "./types";

const BASE_URL = "/api";

export async function chatStream(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No reader available");

  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    full += text;
    onChunk(full);
  }

  return full;
}

export async function fetchLiterature(
  model: GameTheoryModel
): Promise<string> {
  const res = await fetch(`${BASE_URL}/literature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  return data.content;
}
