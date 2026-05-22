import test from "node:test";
import assert from "node:assert/strict";

import { createResearchChatViewMessages } from "./research-chat-view.ts";

test("chat view suppresses a confirmed user message duplicate while reply arrives", () => {
  const confirmedMessages = [
    {
      id: "msg-user-1",
      role: "user",
      content: "那你帮我生成这些性质分析吧。",
      createdAt: 1710000000000,
    },
    {
      id: "msg-assistant-1",
      role: "assistant",
      content: "好的，已生成性质分析建议。",
      createdAt: 1710000001000,
    },
  ];
  const optimisticMessage = {
    id: "msg-optimistic",
    role: "user",
    content: "那你帮我生成这些性质分析吧。",
    createdAt: 1710000000500,
  };

  assert.deepEqual(
    createResearchChatViewMessages(confirmedMessages, optimisticMessage).map(
      (message) => message.id
    ),
    ["msg-user-1", "msg-assistant-1"]
  );
});

