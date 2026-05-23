# Research Generation Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the large research generation module into focused prompt, parsing, quality gate, and fallback modules without changing behavior.

**Architecture:** Keep `src/lib/ai-research-generation.ts` as the public orchestration entry point, but move prompt builders into a `research-generation/prompts.ts` module, structured JSON parsing into `research-generation/parsers.ts`, symbolic validation into `research-generation/quality-gates.ts`, and fallback/project-shaping helpers into `research-generation/fallbacks.ts`. Export only the small set of functions that other files already consume. Leave existing tests passing and add/adjust coverage for the new module boundaries.

**Tech Stack:** TypeScript, Node test runner, existing research-session and symbol-governance helpers.

---

### Task 1: Extract prompt builders

**Files:**
- Create: `src/lib/research-generation/prompts.ts`
- Modify: `src/lib/ai-research-generation.ts`
- Modify: `src/lib/prompts.ts` only if a shared helper genuinely belongs there
- Test: `src/lib/ai-research-generation.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { createDiscoverPrompt } from "./research-generation/prompts.ts";

const messages = createDiscoverPrompt("研究二手平台模型");
assert.equal(messages[0].role, "developer");
assert.match(messages[0].content, /Hotelling/);
assert.match(messages[0].content, /symbolic equilibrium solving/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-transform-types --test src/lib/ai-research-generation.test.mjs`
Expected: FAIL because the new module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export {
  createDiscoverPrompt,
  createBuildPrompt,
  createEquilibriumPrompt,
  createPropertyAnalysisPrompt,
  createConversationPrompt,
};
```

Move the existing prompt factories and their small shared prompt-context helpers into the new module. Keep their returned message arrays unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-transform-types --test src/lib/ai-research-generation.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/research-generation/prompts.ts src/lib/ai-research-generation.ts src/lib/ai-research-generation.test.mjs
git commit -m "refactor: extract research prompt builders"
```

### Task 2: Extract parsers and quality gates

**Files:**
- Create: `src/lib/research-generation/parsers.ts`
- Create: `src/lib/research-generation/quality-gates.ts`
- Modify: `src/lib/ai-research-generation.ts`
- Modify: `src/lib/ai-research-generation.test.mjs`
- Test: `src/lib/ai-research-generation.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { extractFirstJsonObject } from "./research-generation/parsers.ts";
import { isSymbolicEquilibriumResult } from "./research-generation/quality-gates.ts";

assert.deepEqual(extractFirstJsonObject('{"a":1}'), { a: 1 });
assert.equal(isSymbolicEquilibriumResult({ status: "solved", concept: "x", solvingSteps: ["a"], focs: ["b"], conditions: ["c"], closedForm: "p*", derivation: "d", code: "e", warnings: [] }), true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-transform-types --test src/lib/ai-research-generation.test.mjs`
Expected: FAIL until the exports are moved.

- [ ] **Step 3: Write minimal implementation**

```ts
export { extractFirstJsonObject, parseDirections, parseHotellingModel, parseEquilibriumResult, parsePropertyAnalyses };
export { isSymbolicEquilibriumResult, isSymbolicPropertyAnalysis };
```

Keep the same validation logic and thresholds; only move code.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-transform-types --test src/lib/ai-research-generation.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/research-generation/parsers.ts src/lib/research-generation/quality-gates.ts src/lib/ai-research-generation.ts src/lib/ai-research-generation.test.mjs
git commit -m "refactor: extract research parsers and quality gates"
```

### Task 3: Extract fallback and orchestration helpers

**Files:**
- Create: `src/lib/research-generation/fallbacks.ts`
- Modify: `src/lib/ai-research-generation.ts`
- Modify: `src/lib/ai-research-generation.test.mjs`
- Test: `src/lib/ai-research-generation-repair.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { createConversationFallbackAssetPatch } from "./research-generation/fallbacks.ts";

const patch = createConversationFallbackAssetPatch(project, "把 tau_A 改成 p_A");
assert.equal(patch?.kind, "update_model");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-transform-types --test src/lib/ai-research-generation-repair.test.mjs`
Expected: FAIL until the fallback module exists.

- [ ] **Step 3: Write minimal implementation**

```ts
export {
  createBuildFallback,
  createConversationFallbackMessage,
  createConversationFallbackAssetPatch,
  appendConversationMessages,
  appendUserMessageToProject,
};
```

Keep behavior and return shapes unchanged; only move helper code and update imports.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-transform-types --test src/lib/ai-research-generation-repair.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/research-generation/fallbacks.ts src/lib/ai-research-generation.ts src/lib/ai-research-generation.test.mjs src/lib/ai-research-generation-repair.test.mjs
git commit -m "refactor: extract research fallback helpers"
```

### Task 4: Re-run full verification and clean exports

**Files:**
- Modify: `src/lib/ai-research-generation.ts`
- Modify: any import sites that now point at the new modules
- Test: full `src/lib/*.test.mjs`

- [ ] **Step 1: Run the full test suite**

Run: `node --experimental-transform-types --test src/lib/*.test.mjs src/components/research-workspace/*.test.mjs`
Expected: PASS with no behavior changes.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS or, if the environment still blocks remote font fetches, confirm that the refactor itself did not introduce new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai-research-generation.ts src/lib/research-generation/*.ts
git commit -m "refactor: split research generation modules"
```
