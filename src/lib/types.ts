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
