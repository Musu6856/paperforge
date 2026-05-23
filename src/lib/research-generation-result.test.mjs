import test from "node:test";
import assert from "node:assert/strict";

import { attachEquilibriumResult } from "./research-generation/fallbacks.ts";
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

test("symbolic failure fallback is not persisted as completed equilibrium", () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "研究二手平台佣金与补贴策略",
    now: 1710000000000,
  });
  const failed = {
    ...project,
    equilibriumResult: {
      status: "symbolic_failure",
      concept: "隐式系统草稿",
      solvingSteps: ["列出一阶条件"],
      focs: ["F(z,\\theta)=0"],
      conditions: ["\\det J_zF\\ne0"],
      closedForm: "当前没有完整闭式解。",
      derivation: "只得到隐式系统。",
      code: "print('implicit system')",
      warnings: ["不是闭式均衡。"],
    },
    researchSession: {
      ...project.researchSession,
      phase: "equilibrium",
      assetSummary: {
        ...project.researchSession.assetSummary,
        equilibriumStatus: "symbolic_failure",
      },
    },
  };

  const result = {
    project: failed,
    usedFallback: true,
    assistantMessage: "只得到隐式系统草稿",
  };

  assert.equal(getPersistableResearchProject(result), null);
});

test("attaching symbolic failure does not open property analysis action", () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "研究二手平台佣金与补贴策略",
    now: 1710000000000,
  });
  const failed = attachEquilibriumResult(
    confirmResearchModel(
      adoptResearchDirection(project, "secondhand-commission-subsidy-hotelling")
    ),
    {
      status: "symbolic_failure",
      concept: "隐式系统草稿",
      solvingSteps: ["列出一阶条件"],
      focs: ["F(z,\\theta)=0"],
      conditions: ["\\det J_zF\\ne0"],
      closedForm: "当前没有完整闭式解。",
      derivation: "只得到隐式系统。",
      code: "print('implicit system')",
      warnings: ["不是闭式均衡。"],
    },
    "只得到隐式系统草稿。"
  );

  assert.equal(
    failed.researchSession?.assetSummary.pendingDecision?.kind,
    "solve_equilibrium"
  );
});
