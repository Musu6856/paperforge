import test from "node:test";
import assert from "node:assert/strict";

import { generateResearchProject } from "./ai-research-generation.ts";
import { createExplorationProject } from "./research-session.ts";

test("conversation action answers casual messages without rebuilding research assets", async () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "Research secondhand platform pricing",
    now: 1710000000000,
  });
  const built = await generateResearchProject(
    {
      action: "build_model",
      rawIdea: project.rawIdea,
      selectedDirectionId: "secondhand-commission-subsidy-hotelling",
      project,
    },
    {
      complete: async () => "{",
    }
  );
  const beforeModel = built.project.hotellingModel;
  const beforeEquilibrium = built.project.equilibriumResult;
  const assistantMessage =
    "你好，我在。你可以直接问我模型、均衡推导或性质分析哪里需要改。";
  const assetPatch = {
    kind: "update_model",
    summary: "把卖家参与条件收窄为单归属情形",
    changes: [
      {
        target: "hotellingModel.assumptions[2]",
        op: "set",
        value: "卖家只允许单归属，不考虑多归属。",
      },
    ],
  };

  const result = await generateResearchProject(
    {
      action: "continue_conversation",
      rawIdea: built.project.rawIdea,
      userMessage: "你好",
      project: built.project,
    },
    {
      complete: async () =>
        JSON.stringify({
          assistantMessage,
          assetPatch,
        }),
    }
  );
  const messages = result.project.researchSession?.messages ?? [];

  assert.equal(result.usedFallback, false);
  assert.equal(result.assistantMessage, assistantMessage);
  assert.deepEqual(result.assetPatch, assetPatch);
  assert.equal(result.project.researchSession?.phase, "model");
  assert.equal(result.project.hotellingModel, beforeModel);
  assert.equal(result.project.equilibriumResult, beforeEquilibrium);
  assert.equal(messages.at(-2)?.role, "user");
  assert.equal(messages.at(-2)?.content, "你好");
  assert.equal(messages.at(-1)?.role, "assistant");
  assert.equal(messages.at(-1)?.content, assistantMessage);
});

test("conversation action has a local fallback and preserves the current phase", async () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "Research secondhand platform pricing",
    now: 1710000000000,
  });

  const result = await generateResearchProject({
    action: "continue_conversation",
    rawIdea: project.rawIdea,
    userMessage: "你好",
    project,
  });
  const messages = result.project.researchSession?.messages ?? [];

  assert.equal(result.usedFallback, true);
  assert.equal(result.project.researchSession?.phase, "direction");
  assert.equal(messages.at(-2)?.role, "user");
  assert.equal(messages.at(-2)?.content, "你好");
  assert.equal(messages.at(-1)?.role, "assistant");
  assert.match(messages.at(-1)?.content ?? "", /你好|模型|方向|均衡/);
});

test("conversation fallback proposes symbol patches for explicit notation edits", async () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "Research secondhand platform pricing",
    now: 1710000000000,
  });
  const built = await generateResearchProject(
    {
      action: "build_model",
      rawIdea: project.rawIdea,
      selectedDirectionId: "secondhand-commission-subsidy-hotelling",
      project,
    },
    {
      complete: async () => "{",
    }
  );

  const result = await generateResearchProject({
    action: "continue_conversation",
    rawIdea: built.project.rawIdea,
    userMessage: "把 tau_A 改成 f_A",
    project: built.project,
  });

  assert.equal(result.usedFallback, true);
  assert.equal(result.assetPatch?.kind, "update_model");
  assert.equal(result.assetPatch?.changes[0].target, "hotellingModel.symbols[tau_A].symbol");
  assert.equal(result.assetPatch?.changes[0].value, "f_A");
  assert.equal(result.project.hotellingModel, built.project.hotellingModel);
});

test("conversation accepts provider property patch aliases for right-side review", async () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "Research secondhand platform pricing",
    now: 1710000000000,
  });
  const built = await generateResearchProject(
    {
      action: "build_model",
      rawIdea: project.rawIdea,
      selectedDirectionId: "secondhand-commission-subsidy-hotelling",
      project,
    },
    {
      complete: async () => "{",
    }
  );

  const result = await generateResearchProject(
    {
      action: "continue_conversation",
      rawIdea: built.project.rawIdea,
      userMessage: "那你帮我生成这些性质分析吧。",
      project: built.project,
    },
    {
      complete: async () =>
        JSON.stringify({
          assistantMessage:
            "已生成性质分析建议，右侧会显示为待应用修改，确认后再写入结构化资产。",
          assetPatch: {
            kind: "properties",
            summary: "新增三条性质分析",
            changes: [
              {
                path: "propertyAnalyses",
                op: "append",
                value: [
                  {
                    id: "alpha-b-fee",
                    target: "f_S",
                    parameter: "\\alpha_B",
                    operation: "differentiate",
                    symbolicResult: "\\partial f_S/\\partial \\alpha_B=-1",
                    signCondition: "负",
                    propositionDraft: "命题：买家侧网络外部性提高会降低卖家费用。",
                    proofSketch: "由 f_S=t_S-\\alpha_B 直接求导。",
                    intuition: "网络外部性提高后平台更愿意补贴卖家侧。",
                    warnings: [],
                  },
                ],
                reason: "用户要求生成性质分析。",
              },
            ],
          },
        }),
    }
  );

  assert.equal(result.assetPatch?.kind, "update_properties");
  assert.equal(result.assetPatch?.changes[0].op, "insert");
  assert.equal(result.assetPatch?.changes[0].target, "propertyAnalyses");
});
