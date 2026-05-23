import test from "node:test";
import assert from "node:assert/strict";

import {
  buildResearchProjectMarkdown,
  getResearchProjectMarkdownFilename,
} from "./research-export.ts";
import {
  adoptResearchDirection,
  confirmResearchModel,
  createExplorationProject,
  generatePropertyAnalysis,
  generateSymbolicEquilibrium,
} from "./research-session.ts";

function createGeneratedResearchProject(rawIdea = "secondhand platform subsidy") {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    rawIdea,
    now: 1710000000000,
  });

  return generatePropertyAnalysis(
    generateSymbolicEquilibrium(
      confirmResearchModel(
        adoptResearchDirection(project, "secondhand-commission-subsidy-hotelling")
      )
    )
  );
}

test("getResearchProjectMarkdownFilename returns a stable sanitized Markdown filename", () => {
  const project = {
    ...createGeneratedResearchProject(),
    refinedIdea: '  A/B: platform <commission> "subsidy"? *policy*  ',
  };

  assert.equal(
    getResearchProjectMarkdownFilename(project),
    "paperforge-A-B-platform-commission-subsidy-policy.md"
  );
  assert.equal(
    getResearchProjectMarkdownFilename(project),
    "paperforge-A-B-platform-commission-subsidy-policy.md"
  );
});

test("buildResearchProjectMarkdown produces non-empty paper markdown for a fully generated project", () => {
  const analyzed = createGeneratedResearchProject();

  const markdown = buildResearchProjectMarkdown(analyzed);

  assert.ok(markdown.trim().length > 0);
  assert.match(markdown, /^# /);
  assert.match(markdown, /\n## /);
});

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
