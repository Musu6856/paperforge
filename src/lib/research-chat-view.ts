import type { ResearchSessionMessage } from "./types";

export function createResearchChatViewMessages(
  messages: ResearchSessionMessage[],
  optimisticMessage: ResearchSessionMessage | null
): ResearchSessionMessage[] {
  if (!optimisticMessage) return messages;

  const optimisticContent = normalizeMessageContent(optimisticMessage.content);
  const confirmedAlreadyContainsOptimisticMessage = messages.some(
    (message) =>
      message.role === optimisticMessage.role &&
      normalizeMessageContent(message.content) === optimisticContent
  );

  return confirmedAlreadyContainsOptimisticMessage
    ? messages
    : [...messages, optimisticMessage];
}

function normalizeMessageContent(content: string) {
  return content.trim().replace(/\s+/g, " ");
}
