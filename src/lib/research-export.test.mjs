import test from "node:test";
import assert from "node:assert/strict";

import { buildResearchProjectMarkdown } from "./research-export.ts";
import {
  adoptResearchDirection,
  confirmResearchModel,
  createExplorationProject,
  generatePropertyAnalysis,
  generateSymbolicEquilibrium,
} from "./research-session.ts";

test("buildResearchProjectMarkdown includes the core research assets", () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea: "研究二手平台佣金与补贴策略",
    now: 1710000000000,
  });
  const analyzed = generatePropertyAnalysis(
    generateSymbolicEquilibrium(
      confirmResearchModel(
        adoptResearchDirection(project, "secondhand-commission-subsidy-hotelling")
      )
    )
  );

  const markdown = buildResearchProjectMarkdown(analyzed);

  assert.match(markdown, /^# /m);
  assert.match(markdown, /## 研究方向/);
  assert.match(markdown, /## 模型设定/);
  assert.match(markdown, /## 符号均衡/);
  assert.match(markdown, /## 性质分析/);
  assert.match(markdown, /二手平台佣金与补贴策略/);
  assert.match(markdown, /命题草稿/);
});
