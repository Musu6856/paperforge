# PaperForge Hotelling Workbench Design

Date: 2026-05-18

## Purpose

PaperForge will move from a rough model wizard into a focused research workspace for Hotelling-based two-sided platform papers.

The current MVP can collect basic game-theory elements and generate a Model Setup section. That is useful as a demo, but it does not support the real writing workflow for this project. The new version should help the user build a strong research story, learn from existing papers, construct a Hotelling two-sided platform model, solve symbolic equilibrium results, and conduct symbolic property analysis.

This document is a product-design specification for implementation planning. It is similar to a PRD in that it defines product behavior and scope, but it is more developer-facing than a normal PRD: it includes data model implications, module boundaries, failure behavior, and testing expectations. A separate implementation plan should break this design into concrete engineering tasks.

## Scope

### In Scope

- Background story development for a game-theory paper.
- Literature inspiration analysis before modeling.
- A structured Hotelling two-sided platform model builder.
- A symbol dictionary inside the modeling module.
- Configurable decision timing.
- Symbolic equilibrium solving.
- Transparent derivation steps.
- Reusable symbolic solving code, primarily SymPy-oriented.
- Symbolic property analysis using differentiation, comparisons, threshold conditions, and proposition-style outputs.
- Clear failure explanations and model simplification suggestions when symbolic expressions become unmanageable.
- A redesigned UI that is practical for dense theoretical work and polished enough to feel like a serious research tool.

### Out of Scope

- Numerical simulation.
- Numerical equilibrium as a substitute for symbolic equilibrium.
- Numerical comparative statics as a substitute for symbolic property analysis.
- Full related literature review writing.
- General-purpose game theory templates beyond the Hotelling two-sided platform workflow.
- Full paper editor, block editor, comments, collaboration, or PDF preview.

## Core Principles

1. The product must serve theory construction, not generic essay generation.
2. Equilibrium results must be symbolic analytic results.
3. Property analysis must be symbolic.
4. Numerical work belongs to a later simulation module and is not part of V1.
5. The system should be honest when symbolic analysis becomes too complex.
6. AI output should be grounded in structured model data.
7. The user must be able to inspect the solving logic and reuse the generated code.

## Workflow

The project page should become a five-step workspace.

### 1. Background Story

Goal: help the user find a strong paper story before formal modeling.

The module should guide the user through:

- Real-world platform scenario.
- Core conflict or puzzle.
- Why strategic interaction matters.
- Why a two-sided platform lens is appropriate.
- Why Hotelling differentiation is relevant.
- Mechanism intuition.
- Possible contribution angle.

Outputs:

- Research question draft.
- Background narrative draft.
- Mechanism summary.
- Contribution candidates.
- Modeling implications, such as which two sides matter, what the platform controls, and what friction or differentiation drives user choice.

### 2. Literature Inspiration

Goal: help the user extract modeling ideas from papers they have already read before entering their own modeling phase.

This is not a full literature review writer in V1. It should prepare modeling inputs and research positioning.

Inputs:

- Paper title.
- Abstract.
- User notes.
- Pasted text excerpts.
- Optional PDF text if available in a later implementation slice.

Analysis outputs:

- Research question in the imported paper.
- Platform setting.
- Player structure.
- Decision timing.
- Utility or payoff design.
- Hotelling demand construction if present.
- Equilibrium method.
- Key assumptions.
- What can be borrowed.
- What should be changed for the user's paper.
- Possible gap or contribution relative to that paper.

The module should support multiple imported papers and preserve their analyses as project context.

Future extension:

- Convert literature inspiration analyses into a Related Literature section after the model stabilizes.

### 3. Model Building

Goal: create a structured Hotelling two-sided platform model that can be used for symbolic solving.

The symbol dictionary belongs inside this module, not as a separate top-level step.

#### 3.1 Symbol Dictionary

The user should be able to choose symbols and define their meanings.

System-recommended symbols should include common Greek, Latin, subscripted, and superscripted math symbols with code-safe identifiers, such as:

- `alpha` / `α`, `beta` / `β`, `gamma` / `γ` for network effects or sensitivity parameters.
- `t` for transportation cost.
- `p_i` for user-side price.
- `r_i` for merchant-side fee or commission.
- `s_i` for subsidy.
- `q_i` for service quality or non-price investment.
- `c` for marginal cost or investment cost parameter.
- `n_i`, `n_i^C`, or `n_i^M` for consumer-side and merchant-side user masses, counts, or participation levels.
- `m_i` only when the user explicitly wants merchant-side notation separated from `n`.
- `theta` for user type, preference, or sensitivity.

Each symbol should store:

- Display symbol.
- Base symbol, such as `n`.
- Subscript, such as `i`, `A`, `B`, `C`, or `M`.
- Superscript, such as `C`, `M`, `H`, `L`, `0`, or `1`.
- Code identifier used in generated SymPy code.
- Plain-text name.
- Meaning.
- Role: parameter, decision variable, demand variable, utility component, cost parameter, or derived variable.
- Side: platform, consumer side, merchant side, both sides, or global.
- Sign or domain assumption, such as positive, nonnegative, real, bounded in `[0,1]`, or unrestricted.
- Whether the symbol was recommended by the system or created by the user.

The system can recommend meanings and assumptions, but the user can override them. It must not assume a universal meaning for a symbol such as `n`; in this project, `n` commonly denotes consumers and merchants, differentiated by side labels and upper/lower indices.

The symbol picker should make side notation easy. Users should be able to create expressions such as `n_i^C`, `n_i^M`, `p_i^C`, `p_i^M`, or `q_i^G` without manually fighting text input. The UI should still store a code-safe name such as `n_i_C` for SymPy generation.

#### 3.2 Hotelling Setup

The V1 main template is a Hotelling two-sided platform model.

It should support:

- Two competing platforms.
- Two sides of users.
- Hotelling line or differentiated platform choice.
- Cross-side network effects.
- Price or subsidy variables.
- Non-price variables such as quality, effort, green investment, service level, compliance, or algorithmic intensity.
- Platform profit functions.
- Full or partial market coverage assumptions, if needed.

The default decision timing is:

1. Platforms choose non-price variables.
2. Platforms choose prices, fees, commissions, or subsidies.
3. Users on both sides choose platforms according to Hotelling utilities.

The user should be able to customize timing because some papers use simultaneous or mixed timing.

Model outputs should include:

- Formal assumptions.
- Utility functions for both sides.
- Indifferent-user conditions.
- Demand functions.
- Profit functions.
- Decision timing.
- Constraints and parameter assumptions.
- A Model Setup prose draft.

### 4. Equilibrium Solving

Goal: derive symbolic analytic equilibrium results from the structured model.

Hard rule: the product must not use numerical equilibrium as a substitute for symbolic equilibrium.

Expected outputs:

- Equilibrium concept.
- Solving order.
- First-order conditions.
- Second-order or concavity checks when available.
- Reaction functions when relevant.
- Backward-induction steps for sequential timing.
- Closed-form equilibrium expressions.
- Existence or interiority conditions.
- Boundary or case conditions when needed.
- Derivation explanation in prose.
- Reusable SymPy code that reconstructs the symbolic solution.

Failure behavior:

- If symbolic equilibrium cannot be produced, the system should first treat this as a modeling or solvability issue, not as a reason to switch to numerical equilibrium.
- It should identify likely causes, such as missing assumptions, inconsistent timing, undefined symbols, overgeneral utility forms, too many free parameters, or unsupported function forms.
- It should provide concrete simplification suggestions, such as imposing symmetry, reducing parameter count, simplifying cost functions, separating stages, or clarifying sign assumptions.

### 5. Property Analysis

Goal: analyze symbolic equilibrium results.

This corresponds to comparative statics and related theoretical analysis. In the user's writing style, it usually means:

- Differentiating equilibrium expressions with respect to key parameters.
- Comparing two equilibrium expressions.
- Deriving threshold conditions.
- Judging signs under assumptions.
- Producing proposition and corollary drafts.
- Explaining economic intuition.

Hard rule: property analysis must not rely on numerical values.

Expected outputs:

- Selected parameter or comparison target.
- Symbolic derivative or symbolic difference.
- Sign conditions.
- Threshold expressions.
- Proposition draft.
- Proof sketch or derivation steps.
- Economic intuition paragraph.

Symbolic explosion behavior:

- If an expression is too complex, the system should say so directly.
- It should explain whether the issue is expression length, too many parameters, insufficient sign assumptions, multiple branches, or unsupported algebra.
- It should suggest model optimization directions, such as adding symmetry, reducing one network effect parameter, normalizing a transport cost, fixing one side's marginal cost, or splitting the proposition into cases.

## Information Architecture

The existing project page should be redesigned from a left wizard plus output reader into a research workspace.

Suggested layout:

- Left sidebar: project navigation and step status.
- Main panel: active step editor.
- Right or bottom panel: generated outputs, model warnings, and reusable code.

Step navigation:

1. Background
2. Literature
3. Model
4. Equilibrium
5. Analysis

The previous wizard labels such as players, strategies, payoffs, game type, and platform should be folded into the Model step instead of remaining top-level steps.

## UI Design Direction

The current UI is not sufficient for the new workflow. V1 needs a more deliberate research-tool interface: dense, legible, elegant, and useful under repeated daily use.

Design requirements:

- Prioritize practical workflow over landing-page decoration.
- Use a workspace layout, not a marketing layout.
- Avoid nested cards, decorative blobs, generic hero sections, and over-large headings inside tool panels.
- Support dense mathematical forms without visual clutter.
- Make step status, model completeness, warnings, and generated outputs visible without forcing constant scrolling.
- Treat symbols, equations, assumptions, and generated code as first-class objects.
- Use restrained color with enough contrast and clear hierarchy.
- Keep controls compact, predictable, and keyboard-friendly.
- Make formula and code blocks copyable.
- Provide polished empty, loading, warning, and failure states.

Suggested V1 workspace layout:

- Left rail: step navigation, completion state, model warnings.
- Main pane: active editor for background, literature, model, equilibrium, or analysis.
- Right pane or bottom drawer: generated output, derivation trace, and reusable code.
- In the Model step, place symbol dictionary, timing, utilities, demand, and profit functions in clearly separated sections.

Impeccable can be used as a design workflow and audit layer for this redesign. It is not a React component library and should not be added as a runtime UI dependency.

## Data Model

The existing `ResearchProject` type should be extended rather than discarded.

Suggested project fields:

```ts
interface ResearchProject {
  id: string
  createdAt: number
  rawIdea: string
  refinedIdea: string
  model: GameTheoryModel | null
  wizardCompleted: boolean
  sections: PaperSection[]
  references: Reference[]
  background?: BackgroundStory
  literatureAnalyses?: LiteratureAnalysis[]
  hotellingModel?: HotellingModel
  equilibriumResult?: EquilibriumResult
  propertyAnalyses?: PropertyAnalysis[]
}
```

Suggested new structures:

```ts
interface BackgroundStory {
  scenario: string
  puzzle: string
  strategicInteraction: string
  hotellingRationale: string
  mechanismIntuition: string
  contributionCandidates: string[]
  draft: string
}

interface LiteratureAnalysis {
  id: string
  title: string
  sourceText: string
  researchQuestion: string
  modelStructure: string
  timing: string
  utilityDesign: string
  equilibriumMethod: string
  borrowableIdeas: string[]
  differentiationPoints: string[]
}

interface SymbolDefinition {
  id: string
  symbol: string
  baseSymbol: string
  subscript?: string
  superscript?: string
  codeName: string
  name: string
  meaning: string
  role:
    | "parameter"
    | "decision"
    | "demand"
    | "utility"
    | "cost"
    | "derived"
  side: "platform" | "consumer" | "merchant" | "both" | "global"
  assumption: string
  recommended: boolean
}

interface HotellingModel {
  symbols: SymbolDefinition[]
  sides: {
    sideAName: string
    sideBName: string
  }
  platforms: string[]
  timing: ModelStage[]
  utilityFunctions: UtilityFunction[]
  demandDerivation: string
  profitFunctions: ProfitFunction[]
  assumptions: string[]
  modelSetupDraft: string
}

interface UtilityFunction {
  id: string
  side: "consumer" | "merchant"
  platform: string
  expression: string
  notes: string
}

interface ProfitFunction {
  id: string
  platform: string
  expression: string
  notes: string
}

interface ModelStage {
  id: string
  order: number
  name: string
  decisions: string[]
}

interface EquilibriumResult {
  status: "solved" | "needs_revision" | "symbolic_failure"
  concept: string
  solvingSteps: string[]
  focs: string[]
  conditions: string[]
  closedForm: string
  derivation: string
  code: string
  warnings: string[]
}

interface PropertyAnalysis {
  id: string
  target: string
  parameter: string
  operation: "differentiate" | "compare" | "threshold" | "custom"
  symbolicResult: string
  signCondition: string
  propositionDraft: string
  proofSketch: string
  intuition: string
  warnings: string[]
}
```

Exact field names can be refined during implementation, but the core point is that the model, solving results, and analysis must be structured.

## AI and Code Generation

AI should be used to:

- Convert rough ideas into background story candidates.
- Parse imported literature into modeling insights.
- Recommend symbols and assumptions.
- Generate formula drafts from structured inputs.
- Explain derivation steps.
- Draft paper prose.
- Generate SymPy code.
- Explain symbolic failures and suggest model simplifications.

AI should not silently invent numerical substitutes for theory.

For V1, generated SymPy code can be displayed as reproducible code for the user. Whether the app executes the code server-side should be decided in the implementation plan. If execution is added, it must be sandboxed and should report symbolic errors clearly.

## Error Handling

The UI should distinguish:

- Missing input: user has not defined enough model structure.
- Model inconsistency: symbols, timing, utilities, or profit functions conflict.
- Unsupported formula: the structure cannot be parsed into the V1 template.
- Symbolic failure: expressions are too complex or assumptions are insufficient.
- Provider failure: AI service is unavailable.

Error messages should be specific and actionable. They should tell the user what to simplify or clarify.

## Testing Expectations

Tests should cover:

- Symbol dictionary creation and editing.
- Validation of required Hotelling model fields.
- Persistence of new project fields.
- Prompt builders for background, literature inspiration, model setup, equilibrium solving, and property analysis.
- Parsing and display of generated equilibrium and analysis outputs.
- Failure states for missing assumptions or symbolic explosion messages.
- Regression coverage for existing project creation and persistence.

Manual verification should cover:

- Creating a new Hotelling project.
- Adding literature inspiration notes.
- Defining symbols and assumptions.
- Building utilities and profit functions.
- Generating symbolic equilibrium output.
- Generating property analysis from a selected parameter.
- Exporting or copying generated SymPy code.

## Open Decisions for Implementation Planning

1. Whether SymPy code is only generated for user reuse or executed inside the app in V1.
2. Whether imported literature supports pasted text only or PDF text extraction in V1.
3. How strict the formula override path should be in the first implementation slice.
4. Whether existing generic game-theory wizard code should be adapted or replaced with Hotelling-specific modules.
5. Whether database migrations should store new fields as additional JSONB columns or fold them into existing project JSON fields.
6. Whether to install Impeccable project-locally for design commands and anti-pattern checks, or use only its `npx impeccable detect` CLI during UI review.

## Approval Gate

This design should be reviewed before implementation planning. Once approved, the next step is to write an implementation plan that decomposes the work into safe, testable tasks.
