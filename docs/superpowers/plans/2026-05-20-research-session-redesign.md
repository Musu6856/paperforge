# Research Session Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Open Design V3 PaperForge flow: polished landing page, authenticated launch wizard, model-source configuration, and a three-column research workspace that starts with direction discovery instead of a blank Hotelling form.

**Architecture:** Keep the existing Next.js App Router, Clerk auth, Drizzle project persistence, shadcn/base-ui controls, and KaTeX renderer. Add a new research-session layer alongside the legacy Hotelling workbench so old `/projects/[id]` pages remain usable while new sessions live at `/research/[id]`.

**Tech Stack:** Next.js 16 App Router, React 19 client components, Clerk, Drizzle/Postgres, Tailwind 4, shadcn/base-ui, KaTeX via `MarkdownRenderer`, Node test runner for pure helpers.

---

## Source Design Baseline

Use Open Design project `58ffe034-9f42-47ba-b58f-b2a8b7c49706`, active file `paperforge-prototype-3.html`, as the visual and flow reference.

Relevant generated files:

- `paperforge-prototype-3.html`: landing page with asymmetric hero and product preview.
- `auth.html`: login/register gate reference; real implementation should use existing Clerk pages.
- `wizard.html`: two-step launch wizard.
- `workspace.html`: three-column research workspace.
- `css/system.css`: academic product visual tokens. Translate to existing `src/app/globals.css` OKLCH tokens rather than copying hex values blindly.

## File Structure

Create:

- `src/lib/model-source.ts`: model-source types, local-storage helpers, and validation for browser-only API key settings.
- `src/lib/model-source.test.mjs`: Node tests for local-storage-safe serialization and validation.
- `src/lib/research-session.ts`: phase constants, sample direction templates, asset builders, and project transition helpers.
- `src/lib/research-session.test.mjs`: Node tests for direction creation, project creation payloads, and direction adoption.
- `src/components/landing/site-header.tsx`: shared landing navigation.
- `src/components/landing/product-preview.tsx`: homepage product preview from Open Design.
- `src/components/landing/landing-page.tsx`: homepage composition.
- `src/components/launch/launch-wizard.tsx`: authenticated two-step launch flow.
- `src/components/launch/model-source-step.tsx`: PaperForge vs own-model selection and local config form.
- `src/components/launch/research-idea-step.tsx`: research idea input and project creation.
- `src/components/research-workspace/research-workspace.tsx`: three-column workspace container.
- `src/components/research-workspace/research-sidebar.tsx`: exploration/formal project records.
- `src/components/research-workspace/phase-indicator.tsx`: `方向发现 / 模型建立 / 均衡求解 / 性质分析`.
- `src/components/research-workspace/mentor-feed.tsx`: staged modeling mentor conversation.
- `src/components/research-workspace/direction-card.tsx`: direction cards with `采用此方向`.
- `src/components/research-workspace/research-assets-panel.tsx`: right-side current assets and decisions.
- `src/components/research-workspace/math-artifact.tsx`: compact KaTeX-backed formula block.
- `src/app/launch/page.tsx`: protected launch route.
- `src/app/research/page.tsx`: redirect helper to launch or latest project.
- `src/app/research/[id]/page.tsx`: protected research workspace route.

Modify:

- `src/app/page.tsx`: replace current calculator-like homepage with Open Design V3 landing.
- `src/app/sign-in/[[...sign-in]]/page.tsx`: wrap Clerk sign-in in PaperForge-styled gate.
- `src/app/sign-up/[[...sign-up]]/page.tsx`: wrap Clerk sign-up in PaperForge-styled gate.
- `src/proxy.ts`: protect `/launch` and `/research(.*)` in addition to existing protected routes.
- `src/lib/types.ts`: add research-session, direction, conversation, asset, and model-source metadata types.
- `src/db/schema.ts`: add `projectType`, `researchSession`, and `modelSource` columns.
- `src/lib/project-records.ts`: round-trip and sanitize the new optional fields.
- `src/lib/api.ts`: add helpers for creating exploration records and updating research sessions.
- `src/lib/store.tsx`: keep new fields during local updates and project loads.
- `src/app/projects/[id]/page.tsx`: route new research sessions to `/research/[id]` or render a clear bridge, while preserving legacy Hotelling projects.
- `src/app/globals.css`: add academic product tokens/utilities used by landing and workspace.
- `drizzle/*`: add a generated migration for the new project columns.

---

### Task 1: Model Source Foundation

**Files:**
- Create: `src/lib/model-source.ts`
- Create: `src/lib/model-source.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/model-source.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_SOURCE_STORAGE_KEY,
  normalizeModelSourceSettings,
  redactedModelSourceMetadata,
} from "./model-source.ts";

test("model source settings accept PaperForge managed mode", () => {
  assert.deepEqual(
    normalizeModelSourceSettings({ source: "paperforge" }),
    { source: "paperforge" }
  );
});

test("own model settings require provider, model name, and api key", () => {
  const result = normalizeModelSourceSettings({
    source: "own",
    provider: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKey: "sk-test",
  });

  assert.deepEqual(result, {
    source: "own",
    provider: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKey: "sk-test",
  });
});

test("own model settings reject missing api key", () => {
  assert.equal(
    normalizeModelSourceSettings({
      source: "own",
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      apiKey: "",
    }),
    null
  );
});

test("metadata redacts browser-only api key", () => {
  assert.deepEqual(
    redactedModelSourceMetadata({
      source: "own",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.2",
      apiKey: "sk-secret",
    }),
    {
      source: "own",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.2",
      hasBrowserApiKey: true,
    }
  );
});

test("storage key is stable", () => {
  assert.equal(MODEL_SOURCE_STORAGE_KEY, "paperforge:model-source:v1");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test src/lib/model-source.test.mjs
```

Expected: FAIL with a module-not-found error for `./model-source.ts`.

- [ ] **Step 3: Implement model-source helpers**

Create `src/lib/model-source.ts`:

```ts
export const MODEL_SOURCE_STORAGE_KEY = "paperforge:model-source:v1";

export type ModelProviderMode =
  | "openai"
  | "anthropic"
  | "openai-compatible"
  | "anthropic-compatible";

export type PaperForgeModelSourceSettings = {
  source: "paperforge";
};

export type OwnModelSourceSettings = {
  source: "own";
  provider: ModelProviderMode;
  baseUrl?: string;
  model: string;
  apiKey: string;
};

export type ModelSourceSettings =
  | PaperForgeModelSourceSettings
  | OwnModelSourceSettings;

export type ModelSourceMetadata =
  | { source: "paperforge" }
  | {
      source: "own";
      provider: ModelProviderMode;
      baseUrl?: string;
      model: string;
      hasBrowserApiKey: boolean;
    };

const PROVIDERS = new Set<ModelProviderMode>([
  "openai",
  "anthropic",
  "openai-compatible",
  "anthropic-compatible",
]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeModelSourceSettings(
  value: unknown
): ModelSourceSettings | null {
  if (!value || typeof value !== "object") return null;

  const settings = value as Partial<OwnModelSourceSettings> &
    Partial<PaperForgeModelSourceSettings>;

  if (settings.source === "paperforge") {
    return { source: "paperforge" };
  }

  if (settings.source !== "own") return null;
  if (!settings.provider || !PROVIDERS.has(settings.provider)) return null;

  const model = cleanString(settings.model);
  const apiKey = cleanString(settings.apiKey);
  const baseUrl = cleanString(settings.baseUrl);

  if (!model || !apiKey) return null;

  return {
    source: "own",
    provider: settings.provider,
    ...(baseUrl ? { baseUrl } : {}),
    model,
    apiKey,
  };
}

export function redactedModelSourceMetadata(
  settings: ModelSourceSettings
): ModelSourceMetadata {
  if (settings.source === "paperforge") {
    return { source: "paperforge" };
  }

  return {
    source: "own",
    provider: settings.provider,
    ...(settings.baseUrl ? { baseUrl: settings.baseUrl } : {}),
    model: settings.model,
    hasBrowserApiKey: Boolean(settings.apiKey),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
node --test src/lib/model-source.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/model-source.ts src/lib/model-source.test.mjs
git commit -m "feat: add local model source settings"
```

---

### Task 2: Research Session Types And Pure Helpers

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/research-session.ts`
- Create: `src/lib/research-session.test.mjs`

- [ ] **Step 1: Write failing tests for session helpers**

Create `src/lib/research-session.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  adoptResearchDirection,
  buildInitialResearchSession,
  createExplorationProject,
} from "./research-session.ts";

test("buildInitialResearchSession creates direction discovery state", () => {
  const session = buildInitialResearchSession(
    "我想研究二手交易平台的收费和补贴策略"
  );

  assert.equal(session.phase, "direction");
  assert.equal(session.directions.length, 4);
  assert.equal(session.assetSummary.currentDirection, null);
  assert.equal(session.messages[0].role, "user");
  assert.match(session.messages[1].content, /双边市场/);
});

test("createExplorationProject builds a database-safe exploration project", () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    idea: "二手交易平台佣金与补贴",
    now: 1700000000000,
    modelSource: { source: "paperforge" },
  });

  assert.equal(project.projectType, "exploration");
  assert.equal(project.rawIdea, "二手交易平台佣金与补贴");
  assert.equal(project.researchSession?.phase, "direction");
  assert.equal(project.modelSource?.source, "paperforge");
});

test("adoptResearchDirection upgrades exploration to formal project", () => {
  const project = createExplorationProject({
    id: "11111111-1111-4111-8111-111111111111",
    idea: "二手交易平台佣金与补贴",
    now: 1700000000000,
    modelSource: { source: "paperforge" },
  });

  const adopted = adoptResearchDirection(
    project,
    project.researchSession.directions[0].id
  );

  assert.equal(adopted.projectType, "formal");
  assert.equal(adopted.researchSession.phase, "model");
  assert.equal(
    adopted.researchSession.assetSummary.currentDirection?.title,
    "佣金与补贴策略"
  );
  assert.equal(
    adopted.researchSession.assetSummary.equilibriumStatus,
    "等待模型确认"
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test src/lib/research-session.test.mjs
```

Expected: FAIL because `src/lib/research-session.ts` does not exist.

- [ ] **Step 3: Extend project/session types**

Append these types to `src/lib/types.ts` after the existing model-analysis types:

```ts
import type { ModelSourceMetadata } from "./model-source";

export type ResearchProjectType = "exploration" | "formal" | "legacy";

export type ResearchPhase = "direction" | "model" | "equilibrium" | "analysis";

export interface ResearchDirection {
  id: string;
  title: string;
  mechanism: string;
  modelType: string;
  solvability: "高" | "中" | "低";
  complexity: "低" | "中" | "高";
  risks: string[];
  recommended: boolean;
}

export interface ResearchMessage {
  id: string;
  role: "user" | "assistant";
  kind:
    | "idea"
    | "direction_suggestions"
    | "direction_adopted"
    | "model_question"
    | "asset_update";
  content: string;
  createdAt: number;
}

export interface ResearchAssetSummary {
  currentDirection: ResearchDirection | null;
  confirmedAssumptions: string[];
  pendingDecision: string | null;
  utilityFunctions: string[];
  equilibriumStatus: string;
  nextActions: string[];
}

export interface ResearchSession {
  phase: ResearchPhase;
  directions: ResearchDirection[];
  adoptedDirectionId?: string;
  messages: ResearchMessage[];
  assetSummary: ResearchAssetSummary;
}
```

Then extend `ResearchProject` with optional fields:

```ts
  projectType?: ResearchProjectType;
  researchSession?: ResearchSession;
  modelSource?: ModelSourceMetadata;
```

- [ ] **Step 4: Implement research session helpers**

Create `src/lib/research-session.ts`:

```ts
import type {
  ResearchDirection,
  ResearchProject,
  ResearchSession,
} from "./types";
import type { ModelSourceMetadata } from "./model-source";

const SECOND_HAND_DIRECTIONS: ResearchDirection[] = [
  {
    id: "commission-subsidy",
    title: "佣金与补贴策略",
    mechanism: "分析平台对买家和卖家的净收费，允许收费或补贴同时存在。",
    modelType: "双边 Hotelling 平台竞争模型",
    solvability: "高",
    complexity: "中",
    risks: ["需要限制跨边网络效应强度，避免需求正反馈导致内部解不存在。"],
    recommended: true,
  },
  {
    id: "quality-certification",
    title: "质量认证机制",
    mechanism: "将二手商品质量不确定性转化为平台认证或信息披露策略。",
    modelType: "信号博弈或双边平台扩展模型",
    solvability: "中",
    complexity: "高",
    risks: ["类型空间和信念更新会提高符号推导复杂度。"],
    recommended: false,
  },
  {
    id: "platform-governance",
    title: "平台治理强度分析",
    mechanism: "分析审核、处罚和纠纷处理如何影响卖家行为与平台收益。",
    modelType: "委托代理或混合策略治理模型",
    solvability: "高",
    complexity: "中",
    risks: ["需要清楚区分事前准入和事后惩罚的时序。"],
    recommended: false,
  },
  {
    id: "dynamic-lock-in",
    title: "动态竞争与锁定效应",
    mechanism: "研究补贴如何帮助平台争夺早期用户并形成后续锁定。",
    modelType: "多期动态博弈",
    solvability: "中",
    complexity: "高",
    risks: ["多期状态变量可能导致闭式均衡表达式过长。"],
    recommended: false,
  },
];

const DEFAULT_ASSUMPTIONS = [
  "买家与卖家均匀分布在长度为 1 的线性城市上，位置服从 U[0,1]。",
  "用户是单归属的，仅选择加入一家平台。",
  "两侧用户都受到跨边网络外部性影响。",
];

const DEFAULT_UTILITY_FUNCTIONS = [
  "$U_{b,i}=V_b+\\alpha N_{s,i}-p_{b,i}-t_b|x-x_i|$",
  "$U_{s,i}=V_s+\\beta N_{b,i}-p_{s,i}-t_s|y-x_i|$",
];

function nowId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

export function buildInitialResearchSession(
  idea: string,
  now = Date.now()
): ResearchSession {
  return {
    phase: "direction",
    directions: SECOND_HAND_DIRECTIONS,
    messages: [
      {
        id: nowId("msg", 0),
        role: "user",
        kind: "idea",
        content: idea,
        createdAt: now,
      },
      {
        id: nowId("msg", 1),
        role: "assistant",
        kind: "direction_suggestions",
        content:
          "这是一个典型的双边市场问题。为了避免直接进入空白模型表单，我先给出四个可建模方向，并推荐从佣金与补贴策略切入，因为它最适合构造可求解析均衡的双边 Hotelling 模型。",
        createdAt: now,
      },
    ],
    assetSummary: {
      currentDirection: null,
      confirmedAssumptions: [],
      pendingDecision: "请选择一个研究方向，系统会据此进入模型共创。",
      utilityFunctions: [],
      equilibriumStatus: "等待采用方向",
      nextActions: ["采用推荐方向", "比较其他方向", "补充研究背景"],
    },
  };
}

export function createExplorationProject({
  id,
  idea,
  now = Date.now(),
  modelSource,
}: {
  id: string;
  idea: string;
  now?: number;
  modelSource: ModelSourceMetadata;
}): ResearchProject {
  return {
    id,
    createdAt: now,
    rawIdea: idea,
    refinedIdea: idea,
    model: null,
    wizardCompleted: true,
    sections: [],
    references: [],
    projectType: "exploration",
    modelSource,
    researchSession: buildInitialResearchSession(idea, now),
  };
}

export function adoptResearchDirection(
  project: ResearchProject,
  directionId: string,
  now = Date.now()
): ResearchProject {
  if (!project.researchSession) return project;

  const direction = project.researchSession.directions.find(
    (candidate) => candidate.id === directionId
  );

  if (!direction) return project;

  return {
    ...project,
    projectType: "formal",
    researchSession: {
      ...project.researchSession,
      phase: "model",
      adoptedDirectionId: direction.id,
      messages: [
        ...project.researchSession.messages,
        {
          id: `msg-${project.researchSession.messages.length + 1}`,
          role: "user",
          kind: "direction_adopted",
          content: `我选择方向：${direction.title}。`,
          createdAt: now,
        },
        {
          id: `msg-${project.researchSession.messages.length + 2}`,
          role: "assistant",
          kind: "model_question",
          content:
            "已采用该方向。下一步先确认最小可求解模型：两个竞争平台、买家侧和卖家侧、两侧净收费变量、线性跨边网络效应、Hotelling 差异化。请先确认收费模式是固定注册费还是交易分成。",
          createdAt: now,
        },
      ],
      assetSummary: {
        currentDirection: direction,
        confirmedAssumptions: DEFAULT_ASSUMPTIONS,
        pendingDecision:
          "选择收费模式：固定注册费（membership fee）还是按比例交易分成（transaction fee）？",
        utilityFunctions: DEFAULT_UTILITY_FUNCTIONS,
        equilibriumStatus: "等待模型确认",
        nextActions: ["确认效用函数并进行推演", "调整模型假设", "导出 LaTeX 基础框架"],
      },
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
node --test src/lib/research-session.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/research-session.ts src/lib/research-session.test.mjs
git commit -m "feat: add research session helpers"
```

---

### Task 3: Persist Research Session Fields

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/lib/project-records.ts`
- Modify: `src/lib/store.tsx`
- Modify: `src/lib/api.ts`
- Generate: `drizzle/0003_*.sql`

- [ ] **Step 1: Update schema types**

In `src/db/schema.ts`, import `ResearchProjectType`, `ResearchSession`, and `ModelSourceMetadata`, then add these columns to `projects`:

```ts
    projectType: text("project_type")
      .$type<ResearchProjectType>()
      .notNull()
      .default("legacy"),
    researchSession: jsonb("research_session").$type<ResearchSession | null>(),
    modelSource: jsonb("model_source").$type<ModelSourceMetadata | null>(),
```

Add imports:

```ts
  ResearchProjectType,
  ResearchSession,
```

and:

```ts
import type { ModelSourceMetadata } from "@/lib/model-source";
```

- [ ] **Step 2: Generate migration**

Run:

```bash
npm run db:generate
```

Expected: a new migration under `drizzle/` that adds `project_type`, `research_session`, and `model_source`.

If Drizzle names it differently than `0003_*`, keep the generated filename and include it in the commit.

- [ ] **Step 3: Round-trip new fields**

In `src/lib/project-records.ts`, update `projectFromRow`:

```ts
    projectType: row.projectType,
    researchSession: row.researchSession ?? undefined,
    modelSource: row.modelSource ?? undefined,
```

Update `sanitizeProjectPayload` validation to allow the new optional fields:

```ts
    (project.projectType !== undefined &&
      !["exploration", "formal", "legacy"].includes(project.projectType)) ||
```

Return the new fields:

```ts
    projectType: project.projectType ?? "legacy",
    researchSession: project.researchSession,
    modelSource: project.modelSource,
```

- [ ] **Step 4: Persist fields in API routes**

In `src/app/api/projects/route.ts`, add insert values:

```ts
        projectType: project.projectType ?? "legacy",
        researchSession: project.researchSession ?? null,
        modelSource: project.modelSource ?? null,
```

In `src/app/api/projects/[id]/route.ts`, add update values:

```ts
        projectType: project.projectType ?? "legacy",
        researchSession: project.researchSession ?? null,
        modelSource: project.modelSource ?? null,
```

- [ ] **Step 5: Run typecheck/build**

Run:

```bash
npm run build
```

Expected: PASS. If it fails on missing generated database types, fix the import or column names before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts src/lib/project-records.ts src/app/api/projects/route.ts src/app/api/projects/[id]/route.ts drizzle drizzle/meta
git commit -m "feat: persist research session metadata"
```

---

### Task 4: Landing Page From Open Design V3

**Files:**
- Create: `src/components/landing/site-header.tsx`
- Create: `src/components/landing/product-preview.tsx`
- Create: `src/components/landing/landing-page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace homepage tests with visual acceptance checklist**

No automated DOM test exists yet for app pages. Acceptance for this task is manual and browser-based:

- `/` has no research idea input.
- `开始研究` links to `/launch`.
- `登录` links to `/sign-in`.
- `注册` links to `/sign-up`.
- Hero includes a real product preview showing idea, direction, utility function, and assets.
- No purple-blue gradients, decorative blobs, dotted-grid hero background, or calculator form.

- [ ] **Step 2: Create site header**

Create `src/components/landing/site-header.tsx`:

```tsx
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/88 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="size-4" />
          </span>
          <span className="text-base tracking-tight">PaperForge</span>
          <span className="rounded-md border bg-accent px-1.5 py-0.5 font-mono text-[10px] text-accent-foreground">
            BETA
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">功能</a>
          <a href="#model-security" className="hover:text-foreground">模型与安全</a>
          <a href="#docs" className="hover:text-foreground">文档</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/sign-in">登录</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/sign-up">注册</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create product preview**

Create `src/components/landing/product-preview.tsx` using the Open Design V3 structure, but render formulas with semantic HTML and restrained Tailwind classes:

```tsx
import { Badge } from "@/components/ui/badge";

export function ProductPreview() {
  return (
    <div className="relative min-h-[520px] rounded-lg border border-border bg-card shadow-xl shadow-foreground/5">
      <div className="flex h-10 items-center gap-2 border-b bg-muted/60 px-4">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="mx-auto pr-12 font-mono text-xs text-muted-foreground">
          workspace / 双边平台动态定价机制
        </span>
      </div>
      <div className="grid min-h-[480px] grid-cols-[1fr_260px] bg-background">
        <div className="space-y-5 p-5">
          <div className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-border text-xs font-semibold">U</span>
            <p className="rounded-r-md rounded-bl-md border bg-card px-4 py-3 text-sm">
              我想研究二手交易平台的佣金与补贴策略。平台应该对谁收费？
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-foreground font-serif text-xs font-semibold text-background">
              P
            </span>
            <div className="space-y-3 text-sm leading-6">
              <p>这是一个经典的双边市场交叉网络外部性问题。我为您抽象出以下推荐模型：</p>
              <div className="rounded-md border border-primary/40 bg-card p-4 shadow-sm">
                <h3 className="font-serif text-base font-semibold">双边 Hotelling 平台竞争模型</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  引入买方与卖方的差异化网络外部性，推导平台最优倾斜定价。
                </p>
                <div className="mt-3 overflow-x-auto rounded bg-muted/70 px-3 py-2 text-center font-serif text-sm italic">
                  U<sub>b,i</sub> = V<sub>b</sub> + αN<sub>s,i</sub> − p<sub>b,i</sub> − t<sub>b</sub>|x − x<sub>i</sub>|
                </div>
                <div className="mt-3 flex gap-2">
                  <Badge variant="secondary">高可解性</Badge>
                  <Badge variant="outline">含符号推导</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">我们将基于此效用函数开始求解纳什均衡...</p>
            </div>
          </div>
        </div>
        <aside className="border-l bg-card p-4">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            研究资产
          </p>
          <div className="mt-4 space-y-5">
            <div>
              <h4 className="mb-2 text-xs font-semibold">定义变量</h4>
              <AssetRow symbol="α" text="交叉网络外部性" />
              <AssetRow symbol="pᵇ" text="买家净收费" />
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold">核心假设</h4>
              <p className="text-xs leading-5 text-muted-foreground">
                A1. 用户在线性城市上均匀分布。<br />
                A2. 平台固定成本为零。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function AssetRow({ symbol, text }: { symbol: string; text: string }) {
  return (
    <div className="mb-1 flex gap-2 rounded bg-muted/60 px-2 py-1.5 text-xs">
      <span className="w-5 font-serif font-semibold italic text-primary">{symbol}</span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}
```

- [ ] **Step 4: Create landing composition**

Create `src/components/landing/landing-page.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "./product-preview";
import { SiteHeader } from "./site-header";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 py-12 lg:grid-cols-[520px_minmax(0,1fr)] lg:py-16">
        <section>
          <h1 className="font-serif text-5xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            从模糊选题到
            <br />
            可求解的博弈论模型
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            为中文经济学与管科研究者打造的研究工作台。先发现方向，再共创模型，最后进入符号均衡求解与性质分析。
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-base">
              <Link href="/launch">
                开始研究
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-5 text-base">
              <a href="#example">查看示例研究</a>
            </Button>
          </div>
        </section>
        <ProductPreview />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Replace `src/app/page.tsx`**

Replace the current client-heavy homepage with:

```tsx
import { LandingPage } from "@/components/landing/landing-page";

export default function HomePage() {
  return <LandingPage />;
}
```

- [ ] **Step 6: Run lint and browser check**

Run:

```bash
npm run lint
```

Then start dev server and verify `/` manually:

```bash
npm run dev
```

Expected: homepage renders the new landing page; no input textarea appears on `/`.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/landing src/app/globals.css
git commit -m "feat: redesign PaperForge landing page"
```

---

### Task 5: Auth Gate And Route Protection

**Files:**
- Modify: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Modify: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Modify: `src/proxy.ts`

- [ ] **Step 1: Protect launch and research routes**

In `src/proxy.ts`, change:

```ts
const isProtectedRoute = createRouteMatcher(["/projects(.*)", "/api(.*)"]);
```

to:

```ts
const isProtectedRoute = createRouteMatcher([
  "/launch(.*)",
  "/research(.*)",
  "/projects(.*)",
  "/api(.*)",
]);
```

- [ ] **Step 2: Polish Clerk sign-in page**

Replace `src/app/sign-in/[[...sign-in]]/page.tsx` with:

```tsx
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-serif text-2xl font-semibold">
          PaperForge
        </Link>
        <div className="rounded-lg border bg-card p-6 shadow-xl shadow-foreground/5">
          <SignIn fallbackRedirectUrl="/launch" signUpUrl="/sign-up" />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Polish Clerk sign-up page**

Replace `src/app/sign-up/[[...sign-up]]/page.tsx` with:

```tsx
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-serif text-2xl font-semibold">
          PaperForge
        </Link>
        <div className="rounded-lg border bg-card p-6 shadow-xl shadow-foreground/5">
          <SignUp fallbackRedirectUrl="/launch" signInUrl="/sign-in" />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify route protection**

Run:

```bash
npm run lint
```

Manual browser checks:

- Logged out `/launch` redirects to Clerk sign-in.
- Logged out `/research/test` redirects to Clerk sign-in.
- `/sign-in` and `/sign-up` remain reachable.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts src/app/sign-in/[[...sign-in]]/page.tsx src/app/sign-up/[[...sign-up]]/page.tsx
git commit -m "feat: add research flow auth gate"
```

---

### Task 6: Launch Wizard

**Files:**
- Create: `src/app/launch/page.tsx`
- Create: `src/components/launch/launch-wizard.tsx`
- Create: `src/components/launch/model-source-step.tsx`
- Create: `src/components/launch/research-idea-step.tsx`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add API helper**

In `src/lib/api.ts`, add:

```ts
export async function createExplorationProjectApi(
  project: ResearchProject
): Promise<ResearchProject> {
  return createProject(project);
}
```

- [ ] **Step 2: Create protected launch route**

Create `src/app/launch/page.tsx`:

```tsx
import { LaunchWizard } from "@/components/launch/launch-wizard";

export default function LaunchPage() {
  return <LaunchWizard />;
}
```

- [ ] **Step 3: Implement launch wizard container**

Create `src/components/launch/launch-wizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ModelSourceStep } from "./model-source-step";
import { ResearchIdeaStep } from "./research-idea-step";
import type { ModelSourceSettings } from "@/lib/model-source";

export function LaunchWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [settings, setSettings] = useState<ModelSourceSettings>({
    source: "paperforge",
  });

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_600px]">
      <section className="hidden border-r bg-muted/40 p-16 lg:flex lg:flex-col">
        <div className="font-serif text-2xl font-semibold">PaperForge</div>
        <div className="my-auto max-w-lg space-y-6">
          {["自然语言构想", "变量提取与效用函数构建", "纳什均衡与符号求解", "比较静态分析与证明生成"].map((item, index) => (
            <div key={item} className="rounded-md border bg-card px-6 py-4 shadow-sm">
              <p className="font-mono text-[11px] tracking-wide text-primary">PHASE {index + 1}</p>
              <p className="mt-1 font-serif text-base">{item}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col bg-card p-8 sm:p-12 lg:p-16">
        {step === 1 ? (
          <ModelSourceStep
            settings={settings}
            onSettingsChange={setSettings}
            onNext={() => setStep(2)}
          />
        ) : (
          <ResearchIdeaStep
            settings={settings}
            onBack={() => setStep(1)}
          />
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Implement model-source step**

Create `src/components/launch/model-source-step.tsx` using `MODEL_SOURCE_STORAGE_KEY`, `normalizeModelSourceSettings`, and `redactedModelSourceMetadata`. The component must:

- Default to PaperForge model.
- Show own-model form only when selected.
- Save valid settings to `localStorage`.
- Include provider options: OpenAI, Anthropic, OpenAI-compatible, Anthropic-compatible.
- Never send the API key to the server.

Use this event behavior:

```tsx
function handleNext() {
  const normalized = normalizeModelSourceSettings(settings);
  if (!normalized) {
    toast.error("请补全模型来源配置");
    return;
  }
  window.localStorage.setItem(MODEL_SOURCE_STORAGE_KEY, JSON.stringify(normalized));
  onSettingsChange(normalized);
  onNext();
}
```

- [ ] **Step 5: Implement research-idea step**

Create `src/components/launch/research-idea-step.tsx`. On submit:

```tsx
const normalized = normalizeModelSourceSettings(settings);
if (!normalized) {
  toast.error("模型来源配置无效");
  return;
}

const project = createExplorationProject({
  id: crypto.randomUUID(),
  idea,
  modelSource: redactedModelSourceMetadata(normalized),
});

const saved = await createExplorationProjectApi(project);
dispatch({ type: "NEW_PROJECT", payload: saved });
router.push(`/research/${saved.id}`);
```

The input placeholder:

```text
例如：我想研究二手交易平台的收费和补贴策略。在闲鱼等平台上，卖家和买家存在交叉网络外部性，我想分析平台应该对谁收费、对谁补贴。
```

- [ ] **Step 6: Verify launch flow**

Run:

```bash
node --test src/lib/model-source.test.mjs src/lib/research-session.test.mjs
npm run lint
```

Manual browser check while signed in:

- `/launch` opens step 1.
- Selecting own model reveals provider/API fields.
- Step 2 creates a project.
- Submit navigates to `/research/<id>`.

- [ ] **Step 7: Commit**

```bash
git add src/app/launch src/components/launch src/lib/api.ts
git commit -m "feat: add research launch wizard"
```

---

### Task 7: Research Workspace Shell

**Files:**
- Create: `src/app/research/page.tsx`
- Create: `src/app/research/[id]/page.tsx`
- Create: `src/components/research-workspace/research-workspace.tsx`
- Create: `src/components/research-workspace/research-sidebar.tsx`
- Create: `src/components/research-workspace/phase-indicator.tsx`
- Create: `src/components/research-workspace/mentor-feed.tsx`
- Create: `src/components/research-workspace/direction-card.tsx`
- Create: `src/components/research-workspace/research-assets-panel.tsx`
- Create: `src/components/research-workspace/math-artifact.tsx`

- [ ] **Step 1: Create research page loaders**

`src/app/research/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function ResearchIndexPage() {
  redirect("/launch");
}
```

`src/app/research/[id]/page.tsx` should mirror the load pattern from `src/app/projects/[id]/page.tsx`, but render `ResearchWorkspace`.

- [ ] **Step 2: Create shell component**

`ResearchWorkspace` accepts `{ project }` and renders:

- `ResearchSidebar` on the left.
- Header with `PhaseIndicator`.
- `MentorFeed` in the center.
- Input area with placeholder `例如：假设平台只向卖家收取交易分成，对买家免费...`.
- `ResearchAssetsPanel` on the right.

Use fixed product layout:

```tsx
<div className="grid h-screen grid-cols-[260px_minmax(0,1fr)_340px] overflow-hidden bg-background">
```

- [ ] **Step 3: Create phase indicator**

Phases:

```ts
const PHASE_LABELS = {
  direction: "方向发现",
  model: "模型建立",
  equilibrium: "均衡求解",
  analysis: "性质分析",
} as const;
```

Only the current phase should be dark/active; later phases muted.

- [ ] **Step 4: Create mentor feed**

`MentorFeed` renders:

- User idea message.
- Assistant direction explanation.
- Direction cards when `session.phase === "direction"`.
- Adoption/model question when `session.phase !== "direction"`.

Each non-adopted direction card gets a `采用此方向` button wired to `onAdopt(direction.id)`.

- [ ] **Step 5: Create assets panel**

`ResearchAssetsPanel` renders the Open Design V3 sections:

- 当前研究方向
- 已确认假设
- 效用函数
- 均衡求解状态
- 待决策问题
- 下一步操作

Use `MathArtifact` for formulas, passing the formula string to `MarkdownRenderer`.

- [ ] **Step 6: Verify shell**

Run:

```bash
npm run lint
npm run build
```

Manual browser check:

- `/research/<id>` opens without horizontal overflow at 1280px.
- Direction cards show `采用此方向`.
- Right panel is readable and not a blank form.

- [ ] **Step 7: Commit**

```bash
git add src/app/research src/components/research-workspace
git commit -m "feat: add research workspace shell"
```

---

### Task 8: Direction Adoption And Legacy Bridge

**Files:**
- Modify: `src/components/research-workspace/research-workspace.tsx`
- Modify: `src/app/projects/[id]/page.tsx`
- Modify: `src/lib/store.tsx`

- [ ] **Step 1: Wire adoption**

In `ResearchWorkspace`, implement:

```tsx
async function handleAdopt(directionId: string) {
  const nextProject = adoptResearchDirection(project, directionId);
  dispatch({ type: "SET_PROJECT", payload: nextProject });
  await saveProject(nextProject);
  toast.success("已采用方向，进入模型建立阶段");
}
```

Pass it into `MentorFeed`.

- [ ] **Step 2: Preserve new project fields in store**

Ensure `SET_PROJECT`, `UPDATE_PROJECT`, and `NEW_PROJECT` keep `projectType`, `researchSession`, and `modelSource`. The reducer already spreads payloads; no special logic should strip fields.

- [ ] **Step 3: Bridge legacy project page**

In `src/app/projects/[id]/page.tsx`, after project load:

```tsx
if (project.projectType === "exploration" || project.projectType === "formal") {
  router.replace(`/research/${project.id}`);
  return null;
}
```

Keep the old `HotellingWorkbench` rendering for legacy rows where `project.researchSession` is absent.

- [ ] **Step 4: Verify adoption**

Manual browser check:

- Start from `/launch`, create project.
- Click `采用此方向` in `/research/<id>`.
- Phase changes to `模型建立`.
- Right panel shows current direction and utility functions.
- Refresh page and confirm adopted state persists.

- [ ] **Step 5: Commit**

```bash
git add src/components/research-workspace src/app/projects/[id]/page.tsx src/lib/store.tsx
git commit -m "feat: support adopting research directions"
```

---

### Task 9: UI Polish, Responsiveness, And Copy Cleanup

**Files:**
- Modify: `src/components/landing/*`
- Modify: `src/components/launch/*`
- Modify: `src/components/research-workspace/*`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Remove misleading commercialization copy**

Search:

```bash
rg "免费试用|额度|白皮书|定价" src
```

Expected replacements:

- `免费试用额度` -> `测试阶段可用`
- `阅读白皮书` -> `查看示例研究`
- Do not add `定价` navigation.

- [ ] **Step 2: Fix math rendering**

All formulas in research assets should be stored as `$...$` strings and rendered through `MarkdownRenderer`, not hand-written raw LaTeX text.

Use:

```tsx
<MarkdownRenderer content={formula} className="reader-page text-sm" />
```

- [ ] **Step 3: Responsive constraints**

Manual CSS requirements:

- Landing hero stacks below `lg`.
- Workspace can be desktop-first for V1, but at widths below `1024px`, right assets panel should move below the mentor feed or become hidden behind a tab.
- Buttons must not wrap awkwardly in direction cards.

- [ ] **Step 4: Browser visual QA**

Run dev server:

```bash
npm run dev
```

Check:

- `/`
- `/sign-in`
- `/launch`
- `/research/<created-id>`

Viewports:

- Desktop: `1280x720`
- Wide desktop: `1440x900`
- Mobile sanity: `390x844`

Expected:

- No text overlap.
- No horizontal scroll on landing/launch.
- Workspace desktop layout remains readable.
- Mobile workspace shows a clear fallback instead of broken columns.

- [ ] **Step 5: Commit**

```bash
git add src/components src/app/globals.css
git commit -m "style: polish research session UI"
```

---

### Task 10: Full Verification

**Files:**
- No planned source changes unless verification exposes defects.

- [ ] **Step 1: Run pure tests**

```bash
node --test src/lib/model-source.test.mjs src/lib/research-session.test.mjs src/lib/workbench-format.test.mjs src/lib/workbench-localization.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run browser flow**

With the dev server running:

1. Open `/`.
2. Click `开始研究`.
3. Complete sign-in if Clerk requires it.
4. Choose `使用 PaperForge 提供的模型`.
5. Enter `我想研究二手交易平台的收费和补贴策略`.
6. Submit.
7. Confirm `/research/<id>` opens.
8. Click `采用此方向`.
9. Refresh.
10. Confirm the adopted direction and model-stage assets persist.

- [ ] **Step 5: Final commit**

If verification fixes were required:

```bash
git add .
git commit -m "fix: verify research session redesign"
```

If no fixes were required, do not create an empty commit.

---

## Plan Self-Review

- Spec coverage: Covers homepage, auth gate, launch wizard, browser-only API key settings, research records, mentor workspace, asset panel, direction adoption, and legacy project preservation.
- Explicitly out of scope for this implementation: real billing, full PDF literature parsing, full symbolic equilibrium engine replacement, numerical simulation, and server-side storage of user API keys.
- Risk control: Keeps old Hotelling workbench available for legacy projects until the new research workspace fully absorbs model/equilibrium/analysis.
- Verification: Pure tests, lint, build, and browser flow are required before claiming completion.
