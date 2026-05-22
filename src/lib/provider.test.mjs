import test from "node:test";
import assert from "node:assert/strict";

import {
  completeProviderChat,
  createChatCompletionPayload,
  extractChatCompletionContent,
  getProviderConfigForModelSource,
} from "./provider.ts";

const provider = {
  apiKey: "sk-test",
  baseUrl: "https://api.example.com/v1",
  model: "mimo-test",
};

test("provider payload follows MiMo OpenAI-compatible defaults", () => {
  const payload = createChatCompletionPayload(provider, {
    messages: [{ role: "user", content: "ping" }],
    maxCompletionTokens: 32,
  });

  assert.equal(payload.model, "mimo-test");
  assert.equal(payload.max_tokens, 32);
  assert.equal("max_completion_tokens" in payload, false);
  assert.equal(payload.temperature, 1);
  assert.equal(payload.top_p, 0.95);
  assert.equal(payload.stream, false);
  assert.equal(payload.stop, null);
  assert.equal(payload.frequency_penalty, 0);
  assert.equal(payload.presence_penalty, 0);
  assert.deepEqual(payload.thinking, { type: "disabled" });
});

test("extracts assistant content from an OpenAI-compatible response", () => {
  const content = extractChatCompletionContent({
    choices: [
      {
        message: {
          content: "pong",
        },
      },
    ],
  });

  assert.equal(content, "pong");
});

test("completeProviderChat posts to chat completions with bearer auth for DeepSeek", async () => {
  let requestedUrl = "";
  let requestedHeaders = {};
  let requestedBody = {};

  const content = await completeProviderChat(provider, {
    messages: [{ role: "user", content: "ping" }],
    maxCompletionTokens: 16,
    fetch: async (url, init) => {
      requestedUrl = String(url);
      requestedHeaders = init?.headers ?? {};
      requestedBody = JSON.parse(String(init?.body ?? "{}"));

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "pong" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    },
  });

  assert.equal(content, "pong");
  assert.equal(requestedUrl, "https://api.example.com/v1/chat/completions");
  assert.equal(requestedHeaders.Authorization, "Bearer sk-test");
  assert.equal(requestedBody.thinking.type, "disabled");
  assert.equal(requestedBody.max_tokens, 16);
});

test("provider payload can request JSON object output", () => {
  const payload = createChatCompletionPayload(provider, {
    messages: [{ role: "user", content: "return json" }],
    maxCompletionTokens: 128,
    responseFormat: "json_object",
    temperature: 0.2,
  });

  assert.deepEqual(payload.response_format, { type: "json_object" });
  assert.equal(payload.temperature, 0.2);
});

test("provider payload maps developer messages to system for OpenAI-compatible APIs", () => {
  const payload = createChatCompletionPayload(provider, {
    messages: [
      { role: "developer", content: "json only" },
      { role: "user", content: "return json" },
    ],
    maxCompletionTokens: 128,
    responseFormat: "json_object",
  });

  assert.deepEqual(
    payload.messages.map((message) => message.role),
    ["system", "user"]
  );
});

test("provider config prefers generic OpenAI-compatible environment variables", async () => {
  const previous = {
    OPENAI_COMPATIBLE_API_KEY: process.env.OPENAI_COMPATIBLE_API_KEY,
    OPENAI_COMPATIBLE_BASE_URL: process.env.OPENAI_COMPATIBLE_BASE_URL,
    OPENAI_COMPATIBLE_MODEL: process.env.OPENAI_COMPATIBLE_MODEL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  };

  process.env.OPENAI_COMPATIBLE_API_KEY = "sk-compatible";
  process.env.OPENAI_COMPATIBLE_BASE_URL = "https://compatible.example.com/v1";
  process.env.OPENAI_COMPATIBLE_MODEL = "compatible-chat";
  process.env.DEEPSEEK_API_KEY = "sk-deepseek";

  const { getProviderConfig } = await import(
    `./provider.ts?config-test=${Date.now()}`
  );
  const config = getProviderConfig();

  assert.equal(config.apiKey, "sk-compatible");
  assert.equal(config.baseUrl, "https://compatible.example.com/v1");
  assert.equal(config.model, "compatible-chat");

  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test("provider config does not send Anthropic keys to OpenAI-compatible endpoints", async () => {
  const previous = {
    OPENAI_COMPATIBLE_API_KEY: process.env.OPENAI_COMPATIBLE_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };

  delete process.env.OPENAI_COMPATIBLE_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-anthropic";

  const { getProviderConfig } = await import(
    `./provider.ts?anthropic-fallback-test=${Date.now()}`
  );
  const config = getProviderConfig();

  assert.equal(config.apiKey, undefined);

  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test("provider config can use an own OpenAI-compatible runtime model source", () => {
  const config = getProviderConfigForModelSource({
    source: "own",
    provider: "openai-compatible",
    apiKey: "sk-own",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
  });

  assert.deepEqual(config, {
    apiKey: "sk-own",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
  });
});

test("completeProviderChat rejects unsafe base URLs before making a request", async () => {
  let called = false;

  await assert.rejects(
    () =>
      completeProviderChat(
        {
          apiKey: "sk-own",
          baseUrl: "http://169.254.169.254",
          model: "deepseek-chat",
        },
        {
          messages: [{ role: "user", content: "ping" }],
          maxCompletionTokens: 16,
          fetch: async () => {
            called = true;
            throw new Error("should not fetch");
          },
        }
      ),
    /base URL|unsafe|https/i
  );

  assert.equal(called, false);
});

test("provider config rejects own Anthropic model source for OpenAI-compatible generation", () => {
  assert.throws(
    () =>
      getProviderConfigForModelSource({
        source: "own",
        provider: "anthropic",
        apiKey: "sk-own",
        model: "claude-sonnet",
      }),
    /OpenAI-compatible/
  );
});
