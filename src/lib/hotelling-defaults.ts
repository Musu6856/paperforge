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
        name: "消费者需求",
        meaning: "选择平台 i 的消费者数量或质量。",
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
        name: "商家需求",
        meaning: "选择平台 i 的商家数量或质量。",
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
        meaning: "Hotelling 差异化成本或错配成本参数。",
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
        name: "非价格决策",
        decisions: [],
      },
      {
        id: crypto.randomUUID(),
        order: 2,
        name: "价格或补贴决策",
        decisions: [],
      },
      {
        id: crypto.randomUUID(),
        order: 3,
        name: "用户选择",
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
    concept: "子博弈精炼均衡",
    solvingSteps: [],
    focs: [],
    conditions: [],
    closedForm: "",
    derivation: "",
    code: "",
    warnings: [],
  };
}
