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

export interface ResearchProject {
  id: string;
  createdAt: number;
  rawIdea: string;
  refinedIdea: string;
  model: GameTheoryModel | null;
  wizardCompleted: boolean;
  sections: PaperSection[];
  references: Reference[];
}

export type WizardStep =
  | "players"
  | "strategies"
  | "payoffs"
  | "gameType"
  | "platform"
  | "review";
