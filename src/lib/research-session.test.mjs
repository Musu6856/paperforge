import test from "node:test";
import assert from "node:assert/strict";
import {
  adoptResearchDirection,
  createInitialResearchSession,
  createExplorationProject,
} from "./research-session.ts";

test("creates direction discovery state with four direction cards and a pending decision", () => {
  const session = createInitialResearchSession(
    "研究二手平台佣金和补贴策略"
  );

  assert.equal(session.phase, "direction");
  assert.equal(session.assetSummary.currentDirection, undefined);
  assert.equal(session.directions.length, 4);
  assert.equal(session.messages.length, 2);
  assert.equal(session.messages[0].role, "user");
  assert.equal(session.messages[1].role, "assistant");
  assert.equal(session.assetSummary.pendingDecision?.kind, "choose_direction");
  assert.match(
    session.assetSummary.pendingDecision?.prompt ?? "",
    /选择一个研究方向/
  );
  assert.deepEqual(session.assetSummary.confirmedAssumptions, []);
  assert.deepEqual(session.assetSummary.utilityFunctions, []);
  assert.equal(session.assetSummary.equilibriumStatus, "not_started");
  assert.ok(session.assetSummary.nextActions.includes("选择一个研究方向"));

  const first = session.directions[0];
  assert.equal(first.id, "secondhand-commission-subsidy-hotelling");
  assert.match(first.title, /二手平台佣金与补贴策略/);
  assert.match(first.model, /两边 Hotelling 平台竞争模型/);
});

test("creates an exploration project payload with research session and model source metadata", () => {
  const project = createExplorationProject({
    rawIdea: "研究二手平台佣金和补贴策略",
    now: 1710000000000,
    modelSource: {
      source: "own",
      provider: "openai",
      apiKey: "sk-secret",
      model: "gpt-4.1",
    },
  });

  assert.equal(project.createdAt, 1710000000000);
  assert.equal(project.projectType, "exploration");
  assert.equal(project.rawIdea, "研究二手平台佣金和补贴策略");
  assert.equal(project.refinedIdea, "研究二手平台佣金和补贴策略");
  assert.equal(project.wizardCompleted, true);
  assert.equal(project.researchSession?.phase, "direction");
  assert.deepEqual(project.modelSource, {
    source: "own",
    provider: "openai",
    model: "gpt-4.1",
    hasBrowserApiKey: true,
  });
  assert.equal("apiKey" in project.modelSource, false);
});

test("adopts a research direction into model co-creation phase", () => {
  const project = createExplorationProject({
    rawIdea: "研究二手平台佣金和补贴策略",
    now: 1710000000000,
  });

  const adopted = adoptResearchDirection(
    project,
    "secondhand-commission-subsidy-hotelling"
  );

  assert.equal(adopted.projectType, "formal");
  assert.equal(adopted.researchSession?.phase, "model");
  assert.equal(
    adopted.researchSession?.assetSummary.currentDirection?.id,
    "secondhand-commission-subsidy-hotelling"
  );
  assert.equal(
    adopted.researchSession?.assetSummary.pendingDecision?.kind,
    "answer_model_question"
  );
  assert.ok(adopted.researchSession?.messages.length >= 4);
  assert.equal(adopted.hotellingModel?.assumptions.length, 5);
  assert.equal(adopted.hotellingModel?.utilityFunctions.length, 4);
  assert.match(adopted.hotellingModel?.utilityFunctions[0].expression ?? "", /x/);
  assert.equal(adopted.researchSession?.assetSummary.confirmedAssumptions.length, 5);
  assert.equal(adopted.researchSession?.assetSummary.utilityFunctions.length, 4);
  assert.match(
    adopted.researchSession?.assetSummary.utilityFunctions[0] ?? "",
    /^\$.*\$$/
  );
  assert.equal(
    adopted.researchSession?.assetSummary.equilibriumStatus,
    "等待模型确认"
  );
  assert.ok(
    adopted.researchSession?.assetSummary.nextActions.includes(
      "确认佣金和补贴的策略变量"
    )
  );
  assert.equal(adopted.equilibriumResult?.status, "needs_revision");
  assert.equal(adopted.equilibriumResult?.closedForm, "");
  assert.deepEqual(adopted.equilibriumResult?.warnings, [
    "当前仅搭建符号化均衡条件，不进行数值模拟。",
  ]);
});
