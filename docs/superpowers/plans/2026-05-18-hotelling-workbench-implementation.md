# Hotelling Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rough game-theory model wizard with a Hotelling two-sided platform research workspace focused on background story, literature inspiration, model building, symbolic equilibrium, and symbolic property analysis.

**Architecture:** Extend the existing JSONB project persistence model first, then replace the project page with a focused client workspace backed by small typed modules. AI calls stay behind the existing `/api/chat` route for V1; the app generates structured prompts and stores outputs as project fields instead of only storing generated sections.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn-style components, Clerk auth, Neon + Drizzle, existing MiMo-compatible chat API, KaTeX markdown rendering, Impeccable for UI review.

---

## File Structure

### Data and State

- Modify `src/lib/types.ts`
  - Add `BackgroundStory`, `LiteratureAnalysis`, `SymbolDefinition`, `HotellingModel`, `UtilityFunction`, `ProfitFunction`, `ModelStage`, `EquilibriumResult`, and `PropertyAnalysis`.
  - Extend `ResearchProject` with optional V1 workspace fields.
- Modify `src/lib/project-records.ts`
  - Preserve new optional fields when loading from and saving to the DB.
  - Validate array sizes and string lengths for the new fields.
- Modify `src/db/schema.ts`
  - Add explicit JSONB columns for the new workspace fields. The current table stores only specific project fields, not a generic project JSONB blob.
- Add `drizzle/0002_hotelling_workspace.sql`
  - Add `background`, `literature_analyses`, `hotelling_model`, `equilibrium_result`, and `property_analyses` JSONB columns with sensible defaults.
- Modify `src/app/api/projects/route.ts` and `src/app/api/projects/[id]/route.ts`
  - Insert, update, and return the new fields.
- Modify `src/lib/store.tsx`
  - Add update actions for the new workspace fields.

### Prompt and API Helpers

- Modify `src/lib/prompts.ts`
  - Add prompt builders for background story, literature inspiration, model setup, equilibrium solving, and property analysis.
  - Keep old prompts during transition.
- Modify `src/lib/api.ts`
  - Add typed helpers that call `chatStream` with the new prompt builders.

### UI Components

- Add `src/components/hotelling-workbench/workbench.tsx`
  - Owns active step state and renders the five-step workspace.
- Add `src/components/hotelling-workbench/workbench-shell.tsx`
  - Layout: left rail, main pane, right output/code pane.
- Add `src/components/hotelling-workbench/background-step.tsx`
  - Background story inputs and AI draft output.
- Add `src/components/hotelling-workbench/literature-step.tsx`
  - Imported paper notes and inspiration analysis.
- Add `src/components/hotelling-workbench/model-step.tsx`
  - Symbol dictionary, timing, utilities, demand derivation, and profit function sections.
- Add `src/components/hotelling-workbench/symbol-editor.tsx`
  - Base symbol, subscript, superscript, codeName, role, side, assumption.
- Add `src/components/hotelling-workbench/equilibrium-step.tsx`
  - Symbolic equilibrium output, derivation trace, and SymPy code.
- Add `src/components/hotelling-workbench/analysis-step.tsx`
  - Symbolic comparative statics operation, proposition draft, proof sketch, and warnings.
- Add `src/components/hotelling-workbench/math-chip.tsx`
  - Compact symbol display with upper/lower index support.
- Add `src/components/hotelling-workbench/code-block.tsx`
  - Copyable code panel.
- Modify `src/app/projects/[id]/page.tsx`
  - Replace legacy `ModelWizard`/`OutputPanel` rendering with `HotellingWorkbench`.
  - Keep loading/error handling and project fetch behavior.
- Modify `src/app/page.tsx`
  - Update Chinese UI copy to reflect the new Hotelling workbench direction.

### Quality

- Add `PRODUCT.md`
  - Strategic design context for Impeccable.
- Add `DESIGN.md`
  - Seed visual direction for a practical, polished research workspace.
- Run `npx --yes impeccable detect --fast --json src/` during UI verification.

---

## Task 1: Extend Types for the Hotelling Workspace

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add workspace types**

Replace `src/lib/types.ts` with this full content:

```ts
export interface Player {
  name: string;
  description: string;
  objective: string;
}

export interface Strategy {
  player: string;
  options: string[];
}

export interface PayoffStructure {
  description: string;
  type: "matrix" | "function" | "general";
}

export interface PlatformContext {
  hasCrossNetworkEffects: boolean;
  sides: string[];
  pricingModel?: "subscription" | "transaction" | "freemium" | "ad-supported";
}

export interface GameTheoryModel {
  title: string;
  gameType:
    | "simultaneous"
    | "sequential"
    | "repeated"
    | "bargaining"
    | "signaling";
  players: Player[];
  strategies: Strategy[];
  payoffs: PayoffStructure;
  platformContext?: PlatformContext;
  keyAssumptions: string[];
}

export interface Reference {
  title: string;
  authors: string;
  year: number;
  relevance: string;
  category: "foundational" | "two-sided" | "methodology";
}

export interface PaperSection {
  id: string;
  title: string;
  content: string;
  status: "draft" | "generated" | "edited";
}

export interface BackgroundStory {
  scenario: string;
  puzzle: string;
  strategicInteraction: string;
  hotellingRationale: string;
  mechanismIntuition: string;
  contributionCandidates: string[];
  draft: string;
}

export interface LiteratureAnalysis {
  id: string;
  title: string;
  sourceText: string;
  researchQuestion: string;
  modelStructure: string;
  timing: string;
  utilityDesign: string;
  equilibriumMethod: string;
  borrowableIdeas: string[];
  differentiationPoints: string[];
}

export type SymbolRole =
  | "parameter"
  | "decision"
  | "demand"
  | "utility"
  | "cost"
  | "derived";

export type SymbolSide =
  | "platform"
  | "consumer"
  | "merchant"
  | "both"
  | "global";

export interface SymbolDefinition {
  id: string;
  symbol: string;
  baseSymbol: string;
  subscript?: string;
  superscript?: string;
  codeName: string;
  name: string;
  meaning: string;
  role: SymbolRole;
  side: SymbolSide;
  assumption: string;
  recommended: boolean;
}

export interface ModelStage {
  id: string;
  order: number;
  name: string;
  decisions: string[];
}

export interface UtilityFunction {
  id: string;
  side: "consumer" | "merchant";
  platform: string;
  expression: string;
  notes: string;
}

export interface ProfitFunction {
  id: string;
  platform: string;
  expression: string;
  notes: string;
}

export interface HotellingModel {
  symbols: SymbolDefinition[];
  sides: {
    consumerSideName: string;
    merchantSideName: string;
  };
  platforms: string[];
  timing: ModelStage[];
  utilityFunctions: UtilityFunction[];
  demandDerivation: string;
  profitFunctions: ProfitFunction[];
  assumptions: string[];
  modelSetupDraft: string;
}

export interface EquilibriumResult {
  status: "idle" | "solved" | "needs_revision" | "symbolic_failure";
  concept: string;
  solvingSteps: string[];
  focs: string[];
  conditions: string[];
  closedForm: string;
  derivation: string;
  code: string;
  warnings: string[];
}

export interface PropertyAnalysis {
  id: string;
  target: string;
  parameter: string;
  operation: "differentiate" | "compare" | "threshold" | "custom";
  symbolicResult: string;
  signCondition: string;
  propositionDraft: string;
  proofSketch: string;
  intuition: string;
  warnings: string[];
}

export interface ResearchProject {
  id: string;
  createdAt: number;
  rawIdea: string;
  refinedIdea: string;
  model: GameTheoryModel | null;
  wizardCompleted: boolean;
  sections: PaperSection[];
  references: Reference[];
  background?: BackgroundStory;
  literatureAnalyses?: LiteratureAnalysis[];
  hotellingModel?: HotellingModel;
  equilibriumResult?: EquilibriumResult;
  propertyAnalyses?: PropertyAnalysis[];
}

export type WizardStep =
  | "players"
  | "strategies"
  | "payoffs"
  | "gameType"
  | "platform"
  | "review";
```

- [ ] **Step 2: Run TypeScript check**

Run: `npm exec tsc -- --noEmit`

Expected: existing project may fail on unrelated mojibake syntax if present. If it fails because imports need new types, continue to Task 2 and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "Add Hotelling workspace types"
```

---

## Task 2: Persist New Workspace Fields

**Files:**
- Modify: `src/db/schema.ts`
- Add: `drizzle/0002_hotelling_workspace.sql`
- Modify: `src/lib/project-records.ts`
- Modify: `src/app/api/projects/route.ts`
- Modify: `src/app/api/projects/[id]/route.ts`

- [ ] **Step 1: Update Drizzle schema**

In `src/db/schema.ts`, update the import type line to include the new types:

```ts
import type {
  BackgroundStory,
  EquilibriumResult,
  GameTheoryModel,
  HotellingModel,
  LiteratureAnalysis,
  PaperSection,
  PropertyAnalysis,
  Reference,
} from "@/lib/types";
```

Inside the `projects` table definition, add these columns after `references`:

```ts
    background: jsonb("background").$type<BackgroundStory | null>(),
    literatureAnalyses: jsonb("literature_analyses")
      .$type<LiteratureAnalysis[]>()
      .notNull()
      .default([]),
    hotellingModel: jsonb("hotelling_model").$type<HotellingModel | null>(),
    equilibriumResult: jsonb("equilibrium_result").$type<EquilibriumResult | null>(),
    propertyAnalyses: jsonb("property_analyses")
      .$type<PropertyAnalysis[]>()
      .notNull()
      .default([]),
```

- [ ] **Step 2: Add SQL migration**

Create `drizzle/0002_hotelling_workspace.sql`:

```sql
ALTER TABLE "projects" ADD COLUMN "background" jsonb;
ALTER TABLE "projects" ADD COLUMN "literature_analyses" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "projects" ADD COLUMN "hotelling_model" jsonb;
ALTER TABLE "projects" ADD COLUMN "equilibrium_result" jsonb;
ALTER TABLE "projects" ADD COLUMN "property_analyses" jsonb NOT NULL DEFAULT '[]'::jsonb;
```

- [ ] **Step 3: Update row mapping**

In `src/lib/project-records.ts`, update `projectFromRow` to return:

```ts
  return {
    id: row.id,
    createdAt: row.createdAt.getTime(),
    rawIdea: row.rawIdea,
    refinedIdea: row.refinedIdea,
    model: row.model,
    wizardCompleted: row.wizardCompleted || row.sections.length > 0,
    sections: row.sections,
    references: row.references,
    background: row.background ?? undefined,
    literatureAnalyses: row.literatureAnalyses ?? [],
    hotellingModel: row.hotellingModel ?? undefined,
    equilibriumResult: row.equilibriumResult ?? undefined,
    propertyAnalyses: row.propertyAnalyses ?? [],
  };
```

- [ ] **Step 4: Update payload sanitization**

In `src/lib/project-records.ts`, add constants:

```ts
const MAX_LITERATURE_ANALYSES = 20;
const MAX_PROPERTY_ANALYSES = 50;
```

Extend the length validation:

```ts
    (project.literatureAnalyses &&
      project.literatureAnalyses.length > MAX_LITERATURE_ANALYSES) ||
    (project.propertyAnalyses &&
      project.propertyAnalyses.length > MAX_PROPERTY_ANALYSES)
```

Extend the returned object:

```ts
    background: project.background,
    literatureAnalyses: project.literatureAnalyses ?? [],
    hotellingModel: project.hotellingModel,
    equilibriumResult: project.equilibriumResult,
    propertyAnalyses: project.propertyAnalyses ?? [],
```

- [ ] **Step 5: Update project create API**

In `src/app/api/projects/route.ts`, add these values in `.values({ ... })`:

```ts
        background: project.background ?? null,
        literatureAnalyses: project.literatureAnalyses ?? [],
        hotellingModel: project.hotellingModel ?? null,
        equilibriumResult: project.equilibriumResult ?? null,
        propertyAnalyses: project.propertyAnalyses ?? [],
```

- [ ] **Step 6: Update project patch API**

In `src/app/api/projects/[id]/route.ts`, add these values in `.set({ ... })`:

```ts
        background: project.background ?? null,
        literatureAnalyses: project.literatureAnalyses ?? [],
        hotellingModel: project.hotellingModel ?? null,
        equilibriumResult: project.equilibriumResult ?? null,
        propertyAnalyses: project.propertyAnalyses ?? [],
```

- [ ] **Step 7: Run checks**

Run:

```bash
npm exec tsc -- --noEmit
npm run lint
```

Expected: PASS. If Drizzle type metadata needs regenerated snapshots, run `npm run db:generate` and include generated files.

- [ ] **Step 8: Commit**

```bash
git add src/db/schema.ts drizzle/0002_hotelling_workspace.sql src/lib/project-records.ts src/app/api/projects/route.ts "src/app/api/projects/[id]/route.ts"
git commit -m "Persist Hotelling workspace fields"
```

---

## Task 3: Add Workspace Store Actions and Defaults

**Files:**
- Modify: `src/lib/store.tsx`
- Add: `src/lib/hotelling-defaults.ts`

- [ ] **Step 1: Create default helpers**

Create `src/lib/hotelling-defaults.ts`:

```ts
import type {
  BackgroundStory,
  EquilibriumResult,
  HotellingModel,
} from "./types";

export function createEmptyBackground(): BackgroundStory {
  return {
    scenario: "",
    puzzle: "",
    strategicInteraction: "",
    hotellingRationale: "",
    mechanismIntuition: "",
    contributionCandidates: [],
    draft: "",
  };
}

export function createDefaultHotellingModel(): HotellingModel {
  return {
    symbols: [
      {
        id: crypto.randomUUID(),
        symbol: "n_i^C",
        baseSymbol: "n",
        subscript: "i",
        superscript: "C",
        codeName: "n_i_C",
        name: "消费者数量",
        meaning: "平台 i 上消费者侧的参与规模",
        role: "demand",
        side: "consumer",
        assumption: "nonnegative",
        recommended: true,
      },
      {
        id: crypto.randomUUID(),
        symbol: "n_i^M",
        baseSymbol: "n",
        subscript: "i",
        superscript: "M",
        codeName: "n_i_M",
        name: "商家数量",
        meaning: "平台 i 上商家侧的参与规模",
        role: "demand",
        side: "merchant",
        assumption: "nonnegative",
        recommended: true,
      },
      {
        id: crypto.randomUUID(),
        symbol: "t",
        baseSymbol: "t",
        codeName: "t",
        name: "运输成本",
        meaning: "Hotelling 空间中的差异化成本",
        role: "parameter",
        side: "global",
        assumption: "positive",
        recommended: true,
      },
    ],
    sides: {
      consumerSideName: "消费者",
      merchantSideName: "商家",
    },
    platforms: ["A", "B"],
    timing: [
      {
        id: crypto.randomUUID(),
        order: 1,
        name: "非价格变量",
        decisions: ["服务质量", "努力水平", "绿色投入"],
      },
      {
        id: crypto.randomUUID(),
        order: 2,
        name: "价格与补贴",
        decisions: ["消费者价格", "商家佣金", "补贴"],
      },
      {
        id: crypto.randomUUID(),
        order: 3,
        name: "两侧用户选择",
        decisions: ["消费者平台选择", "商家平台选择"],
      },
    ],
    utilityFunctions: [],
    demandDerivation: "",
    profitFunctions: [],
    assumptions: [],
    modelSetupDraft: "",
  };
}

export function createIdleEquilibrium(): EquilibriumResult {
  return {
    status: "idle",
    concept: "Subgame perfect equilibrium",
    solvingSteps: [],
    focs: [],
    conditions: [],
    closedForm: "",
    derivation: "",
    code: "",
    warnings: [],
  };
}
```

- [ ] **Step 2: Add reducer actions**

In `src/lib/store.tsx`, import new types:

```ts
  BackgroundStory,
  EquilibriumResult,
  HotellingModel,
  LiteratureAnalysis,
  PropertyAnalysis,
```

Add actions:

```ts
  | { type: "SET_BACKGROUND"; payload: BackgroundStory }
  | { type: "SET_LITERATURE_ANALYSES"; payload: LiteratureAnalysis[] }
  | { type: "SET_HOTELLING_MODEL"; payload: HotellingModel }
  | { type: "SET_EQUILIBRIUM_RESULT"; payload: EquilibriumResult }
  | { type: "SET_PROPERTY_ANALYSES"; payload: PropertyAnalysis[] }
```

Add reducer cases that update `currentProject` with each field.

- [ ] **Step 3: Run checks**

Run: `npm exec tsc -- --noEmit`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/store.tsx src/lib/hotelling-defaults.ts
git commit -m "Add Hotelling workspace state helpers"
```

---

## Task 4: Add Prompt Builders for the New Workflow

**Files:**
- Modify: `src/lib/prompts.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add prompt builders**

Append these functions to `src/lib/prompts.ts`:

```ts
export function backgroundStoryPrompt(input: string): string {
  return `你是一个博弈论论文选题与建模顾问。请把下面的研究想法整理成适合 Hotelling 双边平台论文的背景故事。

研究想法：
${input}

请输出：
## 现实场景
## 核心矛盾
## 战略互动
## 为什么适合双边平台
## 为什么适合 Hotelling 差异化
## 机制直觉
## 可能贡献

要求：中文，具体，不要泛泛而谈。`;
}

export function literatureInspirationPrompt(title: string, sourceText: string): string {
  return `你是一个博弈论论文阅读助手。请解析这篇文章对 Hotelling 双边平台建模的启发。

文章标题：
${title}

文章内容或笔记：
${sourceText}

请输出：
## 研究问题
## 平台场景
## 参与者和时序
## 效用或收益函数设计
## Hotelling 需求推导
## 均衡方法
## 可借鉴点
## 需要与我的论文区分的点
## 可能的 gap 或贡献角度

要求：中文，聚焦建模启发，不要写完整文献综述。`;
}

export function hotellingModelSetupPrompt(modelJson: string): string {
  return `你是一个 Hotelling 双边平台建模助手。请基于结构化模型生成严格的 Model Setup 草稿。

模型数据：
${modelJson}

要求：
- 使用中文学术写作。
- 明确两侧用户、两个平台、符号字典、效用函数、需求推导、利润函数和决策时序。
- 符号解释必须和用户定义一致。
- 不要生成数值仿真内容。`;
}

export function equilibriumSolvePrompt(modelJson: string): string {
  return `你是一个 Hotelling 双边平台模型求解助手。请基于下面的模型求符号均衡解。

模型数据：
${modelJson}

硬性要求：
- 必须以解析符号解为目标。
- 不得用数值解替代均衡解。
- 展示求解思路、FOC、逆向归纳或反应函数、均衡条件。
- 输出可复用的 Python SymPy 代码。
- 如果无法求出符号解，请说明是模型建错、假设不足、表达式过复杂还是符号条件不足，并给出优化方向。

请按以下结构输出：
## Equilibrium Concept
## Solving Steps
## First-Order Conditions
## Closed-Form Equilibrium
## Conditions
## Derivation Explanation
## SymPy Code
## Warnings`;
}

export function propertyAnalysisPrompt(contextJson: string): string {
  return `你是一个博弈论性质分析助手。请基于符号均衡结果做性质分析。

上下文：
${contextJson}

硬性要求：
- 只能做符号分析。
- 不得使用数值代入替代理论分析。
- 支持求导、相减、阈值条件、符号判断。
- 如果符号爆炸，请如实说明原因并给模型优化方向。

请按以下结构输出：
## Symbolic Operation
## Symbolic Result
## Sign or Threshold Condition
## Proposition
## Proof Sketch
## Economic Intuition
## Warnings`;
}
```

- [ ] **Step 2: Add API helper wrappers**

In `src/lib/api.ts`, import the prompt builders and add:

```ts
export async function generateFromPrompt(prompt: string): Promise<string> {
  return chatStream([{ role: "user", content: prompt }], () => {});
}
```

If streaming UI needs incremental display later, components can call `chatStream` directly.

- [ ] **Step 3: Run checks**

Run: `npm exec tsc -- --noEmit`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompts.ts src/lib/api.ts
git commit -m "Add Hotelling workbench prompts"
```

---

## Task 5: Build Core Workbench Components

**Files:**
- Add: `src/components/hotelling-workbench/math-chip.tsx`
- Add: `src/components/hotelling-workbench/code-block.tsx`
- Add: `src/components/hotelling-workbench/workbench-shell.tsx`
- Add: `src/components/hotelling-workbench/workbench.tsx`

- [ ] **Step 1: Add MathChip**

Create `src/components/hotelling-workbench/math-chip.tsx`:

```tsx
import type { SymbolDefinition } from "@/lib/types";

export function MathChip({ symbol }: { symbol: SymbolDefinition }) {
  return (
    <span className="inline-flex items-center rounded-md border bg-background px-2 py-1 font-mono text-sm">
      <span>{symbol.baseSymbol}</span>
      {symbol.subscript && <sub className="ml-0.5 text-[10px]">{symbol.subscript}</sub>}
      {symbol.superscript && <sup className="text-[10px]">{symbol.superscript}</sup>}
    </span>
  );
}
```

- [ ] **Step 2: Add copyable code block**

Create `src/components/hotelling-workbench/code-block.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/35">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">SymPy</span>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <pre className="max-h-72 overflow-auto p-3 text-xs leading-5">
        <code>{code || "# 生成均衡后会显示可复用代码"}</code>
      </pre>
    </div>
  );
}
```

- [ ] **Step 3: Add shell**

Create `src/components/hotelling-workbench/workbench-shell.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { BookOpen, FunctionSquare, Lightbulb, Network, Sigma } from "lucide-react";

export type WorkbenchStep = "background" | "literature" | "model" | "equilibrium" | "analysis";

const STEPS: Array<{ id: WorkbenchStep; label: string; icon: ReactNode }> = [
  { id: "background", label: "背景故事", icon: <Lightbulb className="h-4 w-4" /> },
  { id: "literature", label: "文献启发", icon: <BookOpen className="h-4 w-4" /> },
  { id: "model", label: "模型建立", icon: <Network className="h-4 w-4" /> },
  { id: "equilibrium", label: "均衡求解", icon: <Sigma className="h-4 w-4" /> },
  { id: "analysis", label: "性质分析", icon: <FunctionSquare className="h-4 w-4" /> },
];

export function WorkbenchShell({
  activeStep,
  onStepChange,
  title,
  main,
  side,
}: {
  activeStep: WorkbenchStep;
  onStepChange: (step: WorkbenchStep) => void;
  title: string;
  main: ReactNode;
  side: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-92px)] gap-4 lg:grid-cols-[220px_minmax(0,1fr)_340px]">
      <aside className="rounded-lg border bg-card p-2">
        <div className="px-2 py-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PaperForge</p>
          <h1 className="mt-1 line-clamp-2 text-sm font-semibold">{title}</h1>
        </div>
        <nav className="mt-3 space-y-1">
          {STEPS.map((step) => (
            <button
              key={step.id}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors data-[active=true]:bg-primary data-[active=true]:text-primary-foreground hover:bg-accent"
              data-active={activeStep === step.id}
              onClick={() => onStepChange(step.id)}
            >
              {step.icon}
              {step.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 rounded-lg border bg-card p-4">{main}</section>
      <aside className="min-w-0 rounded-lg border bg-card p-4">{side}</aside>
    </div>
  );
}
```

- [ ] **Step 4: Add workbench coordinator**

Create `src/components/hotelling-workbench/workbench.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ResearchProject } from "@/lib/types";
import { WorkbenchShell, type WorkbenchStep } from "./workbench-shell";

export function HotellingWorkbench({ project }: { project: ResearchProject }) {
  const [activeStep, setActiveStep] = useState<WorkbenchStep>("background");

  return (
    <WorkbenchShell
      activeStep={activeStep}
      onStepChange={setActiveStep}
      title={project.rawIdea}
      main={
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            当前模块
          </p>
          <h2 className="text-xl font-semibold">
            {activeStep === "background" && "背景故事"}
            {activeStep === "literature" && "文献启发"}
            {activeStep === "model" && "模型建立"}
            {activeStep === "equilibrium" && "均衡求解"}
            {activeStep === "analysis" && "性质分析"}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            这一块会在后续任务中接入结构化编辑器和 AI 输出。
          </p>
        </div>
      }
      side={
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">输出</p>
          <p className="text-sm leading-6 text-muted-foreground">
            推导、警告和代码会显示在这里。
          </p>
        </div>
      }
    />
  );
}
```

- [ ] **Step 5: Run checks**

Run: `npm exec tsc -- --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/hotelling-workbench
git commit -m "Add Hotelling workbench shell"
```

---

## Task 6: Replace Project Page with Workbench Shell

**Files:**
- Modify: `src/app/projects/[id]/page.tsx`

- [ ] **Step 1: Remove legacy generation imports**

In `src/app/projects/[id]/page.tsx`, remove imports for:

```ts
ErrorBoundary
ModelWizard
OutputPanel
chatStream
fetchLiterature
modelSetupPrompt
parseReferencesFromMarkdown
```

Add:

```ts
import { HotellingWorkbench } from "@/components/hotelling-workbench/workbench";
```

- [ ] **Step 2: Remove generation state and handlers**

Remove:

```ts
const [isGenerating, setIsGenerating] = useState(false);
const [isLoadingLit, setIsLoadingLit] = useState(false);
const [literatureContent, setLiteratureContent] = useState("");
const hasGeneratedContent = Boolean(project?.sections.length);
const wizardCompleted = Boolean(project?.wizardCompleted);
const handleGenerate = useCallback(...)
const handleGenerateReferences = useCallback(...)
```

- [ ] **Step 3: Replace loaded project render**

In the loaded project return, keep the header and replace the entire `<main>` content with:

```tsx
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-4 animate-fade-in sm:px-5">
        <HotellingWorkbench project={project} />
      </main>
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm exec tsc -- --noEmit
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/projects/[id]/page.tsx"
git commit -m "Route projects to Hotelling workbench"
```

---

## Task 7: Implement Background and Literature Steps

**Files:**
- Add: `src/components/hotelling-workbench/background-step.tsx`
- Add: `src/components/hotelling-workbench/literature-step.tsx`
- Modify: `src/components/hotelling-workbench/workbench.tsx`

- [ ] **Step 1: Build background step**

Create `src/components/hotelling-workbench/background-step.tsx` with controlled inputs for `scenario`, `puzzle`, `strategicInteraction`, `hotellingRationale`, `mechanismIntuition`, and `draft`. Use `useStore()` to dispatch `SET_BACKGROUND`.

The component should render compact labels and textareas, not large marketing cards.

- [ ] **Step 2: Build literature step**

Create `src/components/hotelling-workbench/literature-step.tsx` with:

- title input
- source text textarea
- button to add an imported paper draft
- list of existing `literatureAnalyses`

On add, create a `LiteratureAnalysis` object with empty analysis fields and dispatch `SET_LITERATURE_ANALYSES`.

- [ ] **Step 3: Wire steps into coordinator**

In `src/components/hotelling-workbench/workbench.tsx`, render:

```tsx
{activeStep === "background" && <BackgroundStep project={project} />}
{activeStep === "literature" && <LiteratureStep project={project} />}
```

Keep placeholders for other steps.

- [ ] **Step 4: Run checks**

Run: `npm exec tsc -- --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/hotelling-workbench/background-step.tsx src/components/hotelling-workbench/literature-step.tsx src/components/hotelling-workbench/workbench.tsx
git commit -m "Add background and literature workspace steps"
```

---

## Task 8: Implement Model Step with Symbol Dictionary

**Files:**
- Add: `src/components/hotelling-workbench/symbol-editor.tsx`
- Add: `src/components/hotelling-workbench/model-step.tsx`
- Modify: `src/components/hotelling-workbench/workbench.tsx`

- [ ] **Step 1: Build symbol editor**

Create `src/components/hotelling-workbench/symbol-editor.tsx` with inputs for:

- base symbol
- subscript
- superscript
- codeName
- name
- meaning
- role select
- side select
- assumption

The display preview must use `MathChip`.

- [ ] **Step 2: Build model step**

Create `src/components/hotelling-workbench/model-step.tsx`:

- Ensure the project has `hotellingModel`, otherwise initialize from `createDefaultHotellingModel()`.
- Render symbol list with edit/delete.
- Render side names, platforms, timing stages, utility function textareas, demand derivation textarea, profit function textareas, assumptions list, model setup draft textarea.
- Dispatch `SET_HOTELLING_MODEL` after edits.

- [ ] **Step 3: Wire model step**

In `workbench.tsx`, render:

```tsx
{activeStep === "model" && <ModelStep project={project} />}
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm exec tsc -- --noEmit
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/hotelling-workbench/symbol-editor.tsx src/components/hotelling-workbench/model-step.tsx src/components/hotelling-workbench/workbench.tsx
git commit -m "Add Hotelling model builder"
```

---

## Task 9: Implement Equilibrium and Analysis Steps

**Files:**
- Add: `src/components/hotelling-workbench/equilibrium-step.tsx`
- Add: `src/components/hotelling-workbench/analysis-step.tsx`
- Modify: `src/components/hotelling-workbench/workbench.tsx`

- [ ] **Step 1: Build equilibrium step**

Create `src/components/hotelling-workbench/equilibrium-step.tsx`:

- Reads `project.hotellingModel`.
- Shows symbolic-only warning.
- Has button "生成符号均衡推导".
- Calls `chatStream` with `equilibriumSolvePrompt(JSON.stringify(project.hotellingModel, null, 2))`.
- Stores streamed content into `equilibriumResult.derivation`.
- Lets user manually edit `closedForm`, `conditions`, `warnings`, and `code`.
- Displays code in `CodeBlock`.

- [ ] **Step 2: Build analysis step**

Create `src/components/hotelling-workbench/analysis-step.tsx`:

- Inputs: target, parameter, operation.
- Shows symbolic-only warning.
- Calls `chatStream` with `propertyAnalysisPrompt(JSON.stringify({ model, equilibrium, request }, null, 2))`.
- Appends a `PropertyAnalysis` item with streamed content in `proofSketch` or `intuition`.
- Displays warnings and proposition draft fields.

- [ ] **Step 3: Wire steps**

In `workbench.tsx`, render:

```tsx
{activeStep === "equilibrium" && <EquilibriumStep project={project} />}
{activeStep === "analysis" && <AnalysisStep project={project} />}
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm exec tsc -- --noEmit
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/hotelling-workbench/equilibrium-step.tsx src/components/hotelling-workbench/analysis-step.tsx src/components/hotelling-workbench/workbench.tsx
git commit -m "Add symbolic equilibrium and analysis steps"
```

---

## Task 10: Update Home Page Copy and Visual Direction

**Files:**
- Add: `PRODUCT.md`
- Add: `DESIGN.md`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add product context**

Create `PRODUCT.md`:

```md
# PaperForge Product Context

## Register

product

## Users

Chinese-speaking researchers writing game theory and platform economics papers, especially Hotelling two-sided platform models.

## Product Purpose

PaperForge helps researchers move from a rough platform-economics idea to a coherent theory workflow: background story, literature inspiration, model construction, symbolic equilibrium, and symbolic property analysis.

## Brand Personality

Precise, research-grade, calm, rigorous, quietly elegant.

## Anti-References

- Generic AI writing SaaS
- Decorative landing pages
- Chatbot-first writing tools
- One-click paper generation
- Numerically substituting theoretical equilibrium
- Purple-blue gradient AI dashboards

## Strategic Design Principles

- The interface should feel like a research instrument, not a marketing demo.
- Dense mathematical work should be readable and calm.
- Symbols, assumptions, equations, and code are primary objects.
- The UI should be practical first, polished second, never decorative at the expense of work.
```

- [ ] **Step 2: Add seed design context**

Create `DESIGN.md`:

```md
---
version: 1
name: PaperForge
register: product
colors:
  background: "oklch(0.985 0.006 88)"
  foreground: "oklch(0.18 0.015 250)"
  primary: "oklch(0.36 0.055 185)"
  accent: "oklch(0.93 0.025 170)"
typography:
  sans: "Geist"
  mono: "Geist Mono"
radius:
  base: "8px"
---

# Overview

PaperForge should feel like a quiet research cockpit: enough density for serious theory work, enough polish that long sessions feel deliberate rather than improvised. The visual system rejects generic AI SaaS tropes and decorative landing-page energy.

# Color

Use restrained tinted neutrals with a teal academic accent. Do not introduce purple-blue gradients or neon AI palettes.

# Typography

Use compact hierarchy. Large type belongs only on the home page, not inside work panels. Mathematical symbols and code use the mono font.

# Layout

Prefer workspace panes, rails, and dense editors. Avoid nested cards. Use borders, spacing, and section headers to separate work areas.

# Components

Controls should be compact and explicit. Symbols, assumptions, equations, and generated code need first-class display.

# Motion

Use short, subtle transitions only for step changes and loading states.
```

- [ ] **Step 3: Update home copy**

In `src/app/page.tsx`, update visible Chinese strings to describe:

- Hotelling 双边平台论文工作台
- 背景故事
- 文献启发
- 模型建立
- 符号均衡
- 性质分析

Do not add a marketing hero. Keep first screen as a usable project creation workspace.

- [ ] **Step 4: Run Impeccable detector**

Run:

```bash
npx --yes impeccable detect --fast --json src/
```

Expected: command completes. Review findings and fix obvious issues such as nested cards, gradient text, and decorative blobs.

- [ ] **Step 5: Run checks**

Run:

```bash
npm exec tsc -- --noEmit
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add PRODUCT.md DESIGN.md src/app/page.tsx src/app/globals.css
git commit -m "Refresh PaperForge product and visual direction"
```

---

## Task 11: Browser Verification

**Files:**
- No required edits unless verification finds issues.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next dev server starts.

- [ ] **Step 2: Open the app**

Open `http://localhost:3000`.

Expected:

- Home page loads.
- Chinese text is not garbled.
- Existing auth buttons still render.

- [ ] **Step 3: Verify project route**

Open an existing project or create a new one after signing in.

Expected:

- Project page shows the five-step workbench.
- Left rail is visible.
- Main pane changes between steps.
- Right output pane is visible.
- No text overlaps at desktop width.

- [ ] **Step 4: Mobile visual check**

Open browser at mobile width.

Expected:

- Workbench panes stack or remain usable.
- Text does not overflow buttons.
- Symbol chips with superscripts remain legible.

- [ ] **Step 5: Final checks**

Run:

```bash
npm exec tsc -- --noEmit
npm run lint
npx --yes impeccable detect --fast --json src/
```

Expected: PASS or documented detector findings with rationale.

- [ ] **Step 6: Commit fixes if needed**

If verification required fixes:

```bash
git add <changed-files>
git commit -m "Polish Hotelling workbench verification issues"
```

---

## Self-Review Notes

- Spec coverage: background, literature inspiration, model building, symbolic equilibrium, and property analysis each have implementation tasks.
- Symbol dictionary now includes base symbol, subscript, superscript, and code-safe names.
- V1 does not include numerical simulation.
- UI redesign is included through workspace components, PRODUCT/DESIGN context, and Impeccable detector.
- Remaining implementation decision: whether generated SymPy is executed server-side. This plan does not execute it in V1; it displays reusable code only.
