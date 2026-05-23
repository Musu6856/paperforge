# Symbol Editing and Model Patch UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make model editing faster and more reliable by adding category-level symbol creation, fixing symbol selection/expansion bugs, and making AI model edits easier to apply.

**Architecture:** Keep symbol governance and symbol editing concerns in the right-side registry components, while conversation-generated model edits continue to flow through the existing asset-patch pipeline. Add only the minimal helper surface needed to make category-based insertion explicit and to keep selection state tied to stable symbol ids. Preserve the current right-panel patch review model, but make the patch presentation more human-readable and actionable.

**Tech Stack:** Next.js App Router, React, TypeScript, node:test, existing research asset patch utilities.

---

### Task 1: Symbol registry UX and selection fix

**Files:**
- Modify: `src/components/research-workspace/editable-symbol-registry.tsx`
- Modify: `src/lib/symbol-governance.ts`
- Test: `src/lib/symbol-governance.test.mjs`

- [x] **Step 1: Write the failing test**

Add a test that exercises grouped symbol display order and verifies all symbol roles can be represented even when empty groups are needed for the UI.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/symbol-governance.test.mjs`
Expected: the new group-coverage assertion fails before the UI helper is updated.

- [x] **Step 3: Write minimal implementation**

Update the registry view so each role header can show its own add button, even when the group is empty, and make new symbols inherit the clicked role automatically. Keep expansion state keyed by stable symbol ids so clicking any later symbol opens that exact row instead of the first saved draft.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/symbol-governance.test.mjs`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/research-workspace/editable-symbol-registry.tsx src/lib/symbol-governance.ts src/lib/symbol-governance.test.mjs
git commit -m "feat: improve symbol registry editing"
```

### Task 2: AI model patch application flow

**Files:**
- Modify: `src/components/research-workspace/research-assets-panel.tsx`
- Modify: `src/components/research-workspace/pending-asset-patches.tsx`
- Modify: `src/components/research-workspace/research-workspace.tsx`
- Modify: `src/lib/ai-research-generation.ts`
- Modify: `src/lib/research-asset-patch-apply.ts`
- Test: `src/lib/research-asset-patch-apply.test.mjs`

- [x] **Step 1: Write the failing test**

Add or extend a patch-application test that proves a model patch containing several symbol insert/replace operations still applies cleanly and leaves the right-side model stale markers in the expected state.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/research-asset-patch-apply.test.mjs`
Expected: the new expectation fails before the patch UX or conversion path is improved.

- [x] **Step 3: Write minimal implementation**

Keep the existing pending-patch workflow, but make it easier to understand and apply: surface a clearer summary for model edits, ensure the panel lands on the model tab when a model patch is being reviewed, and keep the conversation output framed as a direct editable change rather than a textual workaround.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/research-asset-patch-apply.test.mjs`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/components/research-workspace/research-assets-panel.tsx src/components/research-workspace/pending-asset-patches.tsx src/components/research-workspace/research-workspace.tsx src/lib/ai-research-generation.ts src/lib/research-asset-patch-apply.ts src/lib/research-asset-patch-apply.test.mjs
git commit -m "feat: improve model patch application flow"
```

### Task 3: Verification and integration

**Files:**
- Modify: any files touched above only if verification finds a regression

- [x] **Step 1: Run targeted tests**

Run:
```bash
node --test src/lib/symbol-governance.test.mjs src/lib/research-asset-patch-apply.test.mjs
```

- [x] **Step 2: Run app-level verification**

Open the research workspace in the browser and confirm:
- category headers render add actions
- clicking a later symbol opens that symbol's editor
- model patches still show as reviewable right-side changes

- [x] **Step 3: Final commit if anything changed during verification**

```bash
git add -A
git commit -m "feat: polish symbol editing and model patch UX"
```
