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
        codeName: "consumerDemand",
        name: "Consumer demand",
        meaning: "Mass of consumers choosing platform i.",
        role: "demand",
        side: "consumer",
        assumption: "",
        recommended: true,
      },
      {
        id: crypto.randomUUID(),
        symbol: "n_i^M",
        baseSymbol: "n",
        subscript: "i",
        superscript: "M",
        codeName: "merchantDemand",
        name: "Merchant demand",
        meaning: "Mass of merchants choosing platform i.",
        role: "demand",
        side: "merchant",
        assumption: "",
        recommended: true,
      },
      {
        id: crypto.randomUUID(),
        symbol: "t",
        baseSymbol: "t",
        codeName: "transportCost",
        name: "Transport cost",
        meaning: "Hotelling differentiation or mismatch cost parameter.",
        role: "parameter",
        side: "global",
        assumption: "",
        recommended: true,
      },
    ],
    sides: {
      consumerSideName: "Consumers",
      merchantSideName: "Merchants",
    },
    platforms: ["A", "B"],
    timing: [
      {
        id: crypto.randomUUID(),
        order: 1,
        name: "Non-price decision",
        decisions: [],
      },
      {
        id: crypto.randomUUID(),
        order: 2,
        name: "Price/subsidy decision",
        decisions: [],
      },
      {
        id: crypto.randomUUID(),
        order: 3,
        name: "User choice",
        decisions: [],
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
    concept: "",
    solvingSteps: [],
    focs: [],
    conditions: [],
    closedForm: "",
    derivation: "",
    code: "",
    warnings: [],
  };
}
