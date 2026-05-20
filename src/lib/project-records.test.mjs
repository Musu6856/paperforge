import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeProjectPayload } from "./project-records.ts";

const baseProject = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: 1710000000000,
  rawIdea: "研究二手交易平台佣金与补贴策略",
  refinedIdea: "研究二手交易平台佣金与补贴策略",
  model: null,
  wizardCompleted: true,
  sections: [],
  references: [],
};

test("sanitizeProjectPayload rejects non-UUID project ids before database writes", () => {
  const project = sanitizeProjectPayload({
    ...baseProject,
    id: "research-not-a-uuid",
  });

  assert.equal(project, null);
});

test("sanitizeProjectPayload strips raw browser API keys from model source metadata", () => {
  const project = sanitizeProjectPayload({
    ...baseProject,
    projectType: "exploration",
    modelSource: {
      source: "own",
      provider: "openai-compatible",
      baseUrl: " https://api.deepseek.com/v1/ ",
      model: " deepseek-chat ",
      apiKey: "sk-should-never-be-saved",
      hasBrowserApiKey: true,
    },
  });

  assert.deepEqual(project?.modelSource, {
    source: "own",
    provider: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    hasBrowserApiKey: true,
  });
  assert.equal("apiKey" in project.modelSource, false);
});
