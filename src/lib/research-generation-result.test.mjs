import test from "node:test";
import assert from "node:assert/strict";

import { getPersistableResearchProject } from "./research-generation-result.ts";
import {
  adoptResearchDirection,
  confirmResearchModel,
  createExplorationProject,
  generateSymbolicEquilibrium,
} from "./research-session.ts";

test("fallback generation is not persistable", () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "研究二手平台佣金与补贴策略",
    now: 1710000000000,
  });

  const result = {
    project,
    usedFallback: true,
    assistantMessage: "模型服务不可用",
  };

  assert.equal(getPersistableResearchProject(result), null);
});

test("successful generation remains persistable", () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "研究二手平台佣金与补贴策略",
    now: 1710000000000,
  });

  const result = {
    project,
    usedFallback: false,
    assistantMessage: "已生成",
  };

  assert.equal(getPersistableResearchProject(result), project);
});

test("symbolic equilibrium fallback remains persistable", () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "研究二手平台佣金与补贴策略",
    now: 1710000000000,
  });
  const adopted = adoptResearchDirection(
    project,
    "secondhand-commission-subsidy-hotelling"
  );
  const confirmed = confirmResearchModel(adopted);
  const solved = generateSymbolicEquilibrium(confirmed);

  const result = {
    project: solved,
    usedFallback: true,
    assistantMessage: "已生成本地符号均衡推导",
  };

  assert.equal(getPersistableResearchProject(result), solved);
});
