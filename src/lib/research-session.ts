import type {
  EquilibriumResult,
  HotellingModel,
  ModelSourceMetadata,
  ModelSourceProvider,
  ModelSourceSettings,
  ResearchDirection,
  ResearchProject,
  ResearchSession,
  ResearchSessionMessage,
  UtilityFunction,
} from "./types";

const DEFAULT_ID = "secondhand-commission-subsidy-hotelling";
const COMPATIBLE_PROVIDERS = new Set<ModelSourceProvider>([
  "openai-compatible",
  "anthropic-compatible",
]);

export function createInitialResearchSession(rawIdea: string): ResearchSession {
  const trimmedIdea = rawIdea.trim();
  const directionCards = createDirectionCards();

  return {
    phase: "direction",
    directions: directionCards,
    messages: [
      {
        id: "msg-user-initial",
        role: "user",
        content: trimmedIdea,
        createdAt: 0,
      },
      {
        id: "msg-assistant-directions",
        role: "assistant",
        content:
          "我先把研究想法整理成 4 个可推进方向。每个方向都保留可建模的经济机制，你可以先选择一个最想发展的方向。",
        createdAt: 0,
      },
    ],
    assetSummary: {
      confirmedAssumptions: [],
      utilityFunctions: [],
      equilibriumStatus: "not_started",
      nextActions: ["选择一个研究方向"],
      pendingDecision: {
        kind: "choose_direction",
        prompt: "请选择一个研究方向，之后我们会一起细化模型设定。",
      },
    },
  };
}

export function createExplorationProject({
  id = createProjectId(),
  rawIdea,
  now = Date.now(),
  modelSource,
}: {
  id?: string;
  rawIdea: string;
  now?: number;
  modelSource?: Partial<ModelSourceSettings>;
}): ResearchProject {
  const normalizedIdea = rawIdea.trim();
  return {
    id,
    createdAt: now,
    rawIdea: normalizedIdea,
    refinedIdea: normalizedIdea,
    projectType: "exploration",
    model: null,
    wizardCompleted: true,
    sections: [],
    references: [],
    researchSession: createInitialResearchSession(normalizedIdea),
    modelSource: normalizeProjectModelSource(modelSource),
  };
}

export function adoptResearchDirection(
  project: ResearchProject,
  directionId: string
): ResearchProject {
  const session = project.researchSession ?? createInitialResearchSession(project.rawIdea);
  const direction = session.directions.find((card) => card.id === directionId);

  if (!direction) {
    throw new Error("Unknown research direction.");
  }

  const model = createSecondhandCommissionSubsidyModel();
  const equilibriumResult = createSymbolicEquilibriumScaffold();
  const messages: ResearchSessionMessage[] = [
    ...session.messages,
    {
      id: `msg-adopt-${direction.id}`,
      role: "user",
      content: `选择方向：${direction.title}`,
      createdAt: 0,
    },
    {
      id: `msg-model-question-${direction.id}`,
      role: "assistant",
      content:
        "我们先采用二手平台佣金与补贴策略这个方向。下一步需要确认平台补贴对象、佣金口径，以及买卖双方的差异化成本如何进入效用函数。",
      createdAt: 0,
    },
  ];

  return {
    ...project,
    projectType: "formal",
    refinedIdea: direction.title,
    researchSession: {
      ...session,
      phase: "model",
      messages,
      assetSummary: {
        currentDirection: direction,
        confirmedAssumptions: model.assumptions,
        utilityFunctions: model.utilityFunctions.map(
          (entry) => `$${entry.expression}$`
        ),
        equilibriumStatus: "等待模型确认",
        nextActions: [
          "确认佣金和补贴的策略变量",
          "检查买卖双方效用函数",
          "整理符号化一阶条件",
        ],
        pendingDecision: {
          kind: "answer_model_question",
          prompt: "请确认佣金、补贴和买卖双方差异化成本的基本设定。",
        },
      },
    },
    hotellingModel: model,
    equilibriumResult,
  };
}

function createDirectionCards(): ResearchDirection[] {
  return [
    {
      id: DEFAULT_ID,
      title: "二手平台佣金与补贴策略",
      summary:
        "研究两个二手交易平台如何同时选择卖家佣金和买家补贴，并通过双边网络效应影响成交规模。",
      model: "两边 Hotelling 平台竞争模型",
      contribution:
        "刻画佣金收入、补贴成本和跨边网络效应之间的权衡，解释平台何时偏向补贴买家或降低卖家佣金。",
      recommended: true,
    },
    {
      id: "quality-disclosure-trust",
      title: "商品质量披露与信任机制",
      summary:
        "研究平台验货、担保和信息披露如何缓解二手商品质量不确定性，并改变买卖双方参与决策。",
      model: "信号博弈与平台筛选模型",
      contribution:
        "比较强披露和弱披露机制下的交易量、平台利润与低质量商品进入门槛。",
      recommended: false,
    },
    {
      id: "seller-multihoming-pricing",
      title: "卖家多归属与平台定价",
      summary:
        "研究卖家是否同时入驻多个平台时，平台佣金、流量分配和买家匹配效率的变化。",
      model: "双边平台多归属竞争模型",
      contribution:
        "说明多归属如何削弱平台锁定能力，并影响平台对卖家侧和买家侧的收费结构。",
      recommended: false,
    },
    {
      id: "green-reuse-policy",
      title: "绿色再流通政策与平台激励",
      summary:
        "研究补贴、认证和低碳标签如何提升二手交易参与度，并影响平台对环保属性的策略选择。",
      model: "政策激励下的平台竞争模型",
      contribution:
        "连接循环经济政策与平台商业模式，分析公共补贴和平台补贴之间的替代或互补关系。",
      recommended: false,
    },
  ];
}

function createSecondhandCommissionSubsidyModel(): HotellingModel {
  const utilityFunctions: UtilityFunction[] = [
    {
      id: "u-buyer-a",
      side: "consumer",
      platform: "A",
      expression: "U_{A}^{B} = v_B + \\alpha_B n_{A}^{S} + s_A - p - t_B x",
      notes: "买家位于 Hotelling 线段 x，选择平台 A 时获得卖家规模带来的跨边网络效应和买家补贴。",
    },
    {
      id: "u-buyer-b",
      side: "consumer",
      platform: "B",
      expression: "U_{B}^{B} = v_B + \\alpha_B n_{B}^{S} + s_B - p - t_B (1 - x)",
      notes: "买家选择平台 B 时承担到右端平台的差异化成本。",
    },
    {
      id: "u-seller-a",
      side: "merchant",
      platform: "A",
      expression: "U_{A}^{S} = v_S + \\alpha_S n_{A}^{B} - \\tau_A q - t_S y",
      notes: "卖家位于 Hotelling 线段 y，平台 A 对成交额收取佣金 tau_A q。",
    },
    {
      id: "u-seller-b",
      side: "merchant",
      platform: "B",
      expression: "U_{B}^{S} = v_S + \\alpha_S n_{B}^{B} - \\tau_B q - t_S (1 - y)",
      notes: "卖家选择平台 B 时在佣金和买家规模之间权衡。",
    },
  ];

  return {
    symbols: [],
    sides: {
      consumerSideName: "买家",
      merchantSideName: "卖家",
    },
    platforms: ["A", "B"],
    timing: [
      {
        id: "stage-commission-subsidy",
        order: 1,
        name: "平台选择佣金和补贴",
        decisions: ["\\tau_A", "\\tau_B", "s_A", "s_B"],
      },
      {
        id: "stage-participation",
        order: 2,
        name: "买家和卖家选择平台",
        decisions: ["x", "y"],
      },
      {
        id: "stage-transaction",
        order: 3,
        name: "平台撮合交易并获得收益",
        decisions: ["n_i^B", "n_i^S"],
      },
    ],
    utilityFunctions,
    demandDerivation:
      "由买家无差异条件 U_A^B = U_B^B 和卖家无差异条件 U_A^S = U_B^S 推导两侧需求份额，再代入平台利润函数。",
    profitFunctions: [
      {
        id: "profit-a",
        platform: "A",
        expression: "Pi_A = tau_A q n_A^S n_A^B - s_A n_A^B",
        notes: "平台 A 的佣金收入来自卖家成交，补贴成本按买家参与规模计。",
      },
      {
        id: "profit-b",
        platform: "B",
        expression: "Pi_B = tau_B q n_B^S n_B^B - s_B n_B^B",
        notes: "平台 B 采用相同结构，便于比较对称与非对称策略。",
      },
    ],
    assumptions: [
      "两个平台位于 Hotelling 线段两端，买家和卖家各自单归属。",
      "买家和卖家均受到对侧参与规模的正向跨边网络效应影响。",
      "平台先同时选择卖家佣金 \\tau_i 和买家补贴 s_i。",
      "佣金按单位成交价值 q 收取，补贴按买家参与规模支付。",
      "均衡分析仅采用符号化一阶条件与参数约束，不进行数值模拟。",
    ],
    modelSetupDraft:
      "考虑两个竞争性二手交易平台 A 与 B。平台通过卖家佣金和买家补贴影响双边参与规模，并在跨边网络效应下形成策略互动。",
  };
}

function createSymbolicEquilibriumScaffold(): EquilibriumResult {
  return {
    status: "needs_revision",
    concept: "符号化子博弈精炼均衡",
    solvingSteps: [
      "写出买家侧和卖家侧无差异条件。",
      "求得两侧需求份额并代入平台利润函数。",
      "对 \\tau_i 和 s_i 写出符号化一阶条件。",
      "整理均衡存在所需的内部解和二阶条件。",
    ],
    focs: [
      "\\frac{\\partial \\Pi_i}{\\partial \\tau_i}=0",
      "\\frac{\\partial \\Pi_i}{\\partial s_i}=0",
    ],
    conditions: [
      "t_B > 0",
      "t_S > 0",
      "\\alpha_B 和 \\alpha_S 保证需求份额位于 [0, 1]",
    ],
    closedForm: "",
    derivation: "等待用户确认模型设定后继续推导符号化均衡。",
    code: "",
    warnings: ["当前仅搭建符号化均衡条件，不进行数值模拟。"],
  };
}

function createProjectId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("crypto.randomUUID is required to create a research project.");
}

function normalizeProjectModelSource(
  value: Partial<ModelSourceSettings> | undefined
): ModelSourceMetadata {
  const input = (value ?? {}) as Partial<OwnModelSourceInput>;
  const source = input.source ?? "paperforge";

  if (source !== "paperforge" && source !== "own") {
    throw new Error("Unknown model source.");
  }

  if (source === "paperforge") {
    return { source: "paperforge" };
  }

  const provider = input.provider;
  if (!provider || !isModelSourceProvider(provider)) {
    throw new Error("Model provider is required for own model source.");
  }
  const apiKey = trimOptional(input.apiKey);
  if (!apiKey) {
    throw new Error("API key is required for own model source.");
  }
  const model = trimOptional(input.model);
  if (!model) {
    throw new Error("Model is required for own model source.");
  }

  const metadata: ModelSourceMetadata = {
    source,
    provider,
    model,
    hasBrowserApiKey: true,
  };
  const baseUrl = trimEndpoint(input.baseUrl);

  if (COMPATIBLE_PROVIDERS.has(provider)) {
    if (!baseUrl) {
      throw new Error("Base URL is required for compatible model provider.");
    }
    metadata.baseUrl = baseUrl;
  } else if (baseUrl) {
    metadata.baseUrl = baseUrl;
  }

  return metadata;
}

type OwnModelSourceInput = {
  source: string;
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

function isModelSourceProvider(value: string): value is ModelSourceProvider {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "openai-compatible" ||
    value === "anthropic-compatible"
  );
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimEndpoint(value: unknown): string | undefined {
  const trimmed = trimOptional(value);
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
}
