import test from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_SOURCE_STORAGE_KEY,
  getModelSourceMetadata,
  normalizeModelSourceSettings,
} from "./model-source.ts";

test("normalizes PaperForge managed model settings", () => {
  const settings = normalizeModelSourceSettings({ source: "paperforge" });

  assert.equal(settings.source, "paperforge");
  assert.equal(settings.apiKey, undefined);
  assert.equal(settings.baseUrl, undefined);
  assert.deepEqual(getModelSourceMetadata(settings), {
    source: "paperforge",
  });
});

test("normalizes own OpenAI model settings and redacts API key from metadata", () => {
  const settings = normalizeModelSourceSettings({
    source: "own",
    provider: "openai",
    apiKey: " sk-live-secret ",
    model: " gpt-4.1 ",
  });
  const metadata = getModelSourceMetadata(settings);

  assert.equal(settings.source, "own");
  assert.equal(settings.provider, "openai");
  assert.equal(settings.apiKey, "sk-live-secret");
  assert.equal(settings.model, "gpt-4.1");
  assert.equal(metadata.hasBrowserApiKey, true);
  assert.equal("apiKey" in metadata, false);
  assert.deepEqual(metadata, {
    source: "own",
    provider: "openai",
    model: "gpt-4.1",
    hasBrowserApiKey: true,
  });
});

test("normalizes compatible providers with trimmed endpoint metadata", () => {
  const openaiCompatible = normalizeModelSourceSettings({
    source: "own",
    provider: "openai-compatible",
    apiKey: " local-key ",
    baseUrl: " https://models.example.com/v1/ ",
    model: " qwen-plus ",
  });
  const anthropicCompatible = normalizeModelSourceSettings({
    source: "own",
    provider: "anthropic-compatible",
    apiKey: " anthropic-key ",
    baseUrl: " https://anthropic.example.com ",
    model: " claude-compatible ",
  });

  assert.deepEqual(getModelSourceMetadata(openaiCompatible), {
    source: "own",
    provider: "openai-compatible",
    baseUrl: "https://models.example.com/v1",
    model: "qwen-plus",
    hasBrowserApiKey: true,
  });
  assert.deepEqual(getModelSourceMetadata(anthropicCompatible), {
    source: "own",
    provider: "anthropic-compatible",
    baseUrl: "https://anthropic.example.com",
    model: "claude-compatible",
    hasBrowserApiKey: true,
  });
});

test("rejects own model settings without browser API key", () => {
  assert.throws(
    () =>
      normalizeModelSourceSettings({
        source: "own",
        provider: "anthropic",
        apiKey: "",
        model: "claude-sonnet",
      }),
    /API key/
  );
});

test("uses a stable browser-local storage key", () => {
  assert.equal(MODEL_SOURCE_STORAGE_KEY, "paperforge:model-source:v1");
});
