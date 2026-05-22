import type {
  EquilibriumResult,
  HotellingModel,
  ModelSourceMetadata,
  ModelSourceProvider,
  ModelSourceSettings,
  PropertyAnalysis,
  ResearchDirection,
  ResearchProject,
  ResearchSession,
  ResearchSessionMessage,
  SymbolDefinition,
  UtilityFunction,
} from "./types";
import {
  createHotellingSymbolSeed,
  createSymbolDraft,
  mergeSymbolRegistries,
  normalizeSymbolRegistry,
} from "./symbol-governance.ts";

const DEFAULT_ID = "secondhand-commission-subsidy-hotelling";
const SELLER_MULTIHOMING_ID = "seller-multihoming-pricing";
const COMPATIBLE_PROVIDERS = new Set<ModelSourceProvider>([
  "openai-compatible",
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

  const model = createFallbackModelForDirection(direction);
  const equilibriumResult = createSymbolicEquilibriumScaffold(direction);
  const messages: ResearchSessionMessage[] = [
    ...session.messages,
    {
      id: `msg-adopt-${direction.id}`,
      role: "user",
      content: `选择方向：${direction.title}。`,
      createdAt: 0,
    },
    {
      id: `msg-model-question-${direction.id}`,
      role: "assistant",
      content:
        `我们先采用${direction.title}这个方向。下一步需要先把模型设定、关键变量和机制口径确认清楚，再继续推进。`,
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

export function confirmResearchModel(project: ResearchProject): ResearchProject {
  const session = project.researchSession ?? createInitialResearchSession(project.rawIdea);

  if (!project.hotellingModel) {
    throw new Error("A research model must exist before confirmation.");
  }

  const messages: ResearchSessionMessage[] = [
    ...session.messages,
    {
      id: `msg-confirm-model-${Date.now()}`,
      role: "user",
      content: "确认当前模型设定，准备进入均衡求解。",
      createdAt: 0,
    },
    {
      id: `msg-ready-to-solve-${Date.now()}`,
      role: "assistant",
      content:
        "模型设定已经确认，我已经把工作台切到均衡页。下一步不会自动跳到性质分析；请先检查需求份额、一阶条件和约束是否与你的论文设定一致，然后点击“开始符号求解”。这一步将生成符号推导过程、闭式均衡表达或符号爆炸说明，以及可复用的 SymPy 求解代码。",
      createdAt: 0,
    },
  ];

  return {
    ...project,
    researchSession: {
      ...session,
      phase: "equilibrium",
      messages,
      assetSummary: {
        ...session.assetSummary,
        equilibriumStatus: "等待开始求解",
        pendingDecision: {
          kind: "solve_equilibrium",
          prompt:
            "模型已确认。请检查需求份额、一阶条件和约束是否符合你的论文设定；确认后点击开始符号求解。",
        },
        nextActions: [
          "确认需求份额和一阶条件",
          "点击开始符号求解后进入均衡求解阶段",
          "解析解完成后再进入性质分析",
        ],
      },
    },
  };
}

export function generateSymbolicEquilibrium(
  project: ResearchProject
): ResearchProject {
  const session =
    project.researchSession ?? createInitialResearchSession(project.rawIdea);

  if (!project.hotellingModel) {
    throw new Error("A confirmed Hotelling model is required before solving.");
  }

  const messages: ResearchSessionMessage[] = [
    ...session.messages,
    {
      id: `msg-start-equilibrium-${Date.now()}`,
      role: "user",
      content: "开始符号均衡求解。",
      createdAt: 0,
    },
    {
      id: `msg-equilibrium-solved-${Date.now()}`,
      role: "assistant",
      content:
        "我先给出一版可写入论文推导的符号均衡资产：从两侧无差异条件得到需求份额，再把需求代入平台利润函数，并在对称内部候选均衡下联立一阶条件得到佣金与补贴的闭式解。结果会自动切到性质分析页，方便继续检查比较静态。若后续模型加入非对称平台或更多状态变量，应继续做一般符号求解，而不是改用数值模拟。",
      createdAt: 0,
    },
  ];

  return applySymbolicEquilibriumResult(project, session, messages);
}

export function generatePropertyAnalysis(project: ResearchProject): ResearchProject {
  const session =
    project.researchSession ?? createInitialResearchSession(project.rawIdea);

  if (
    !project.equilibriumResult ||
    project.equilibriumResult.status === "idle" ||
    project.equilibriumResult.status === "needs_revision"
  ) {
    throw new Error("A symbolic equilibrium asset is required before analysis.");
  }

  const analyses = createPropertyAnalysesForDirection(
    getActiveDirection(session),
    project.equilibriumResult
  );
  const messages: ResearchSessionMessage[] = [
    ...session.messages,
    {
      id: `msg-start-analysis-${Date.now()}`,
      role: "user",
      content: "生成性质分析。",
      createdAt: 0,
    },
    {
      id: `msg-analysis-ready-${Date.now()}`,
      role: "assistant",
      content:
        "我基于对称内部闭式解整理了一组性质分析：直接对佣金、补贴和内部解条件做符号求导与阈值整理。这里仍然只使用符号求导、相减和符号条件，不用数值代入替代理论分析。",
      createdAt: 0,
    },
  ];

  return {
    ...project,
    propertyAnalyses: analyses,
    researchSession: {
      ...session,
      phase: "analysis",
      messages,
      assetSummary: {
        ...session.assetSummary,
        equilibriumStatus: project.equilibriumResult.status,
        pendingDecision: undefined,
        nextActions: [
          "整理命题与证明草稿",
          "检查符号条件是否符合论文假设",
          "必要时回到模型设定收窄变量",
        ],
      },
    },
  };
}

function applySymbolicEquilibriumResult(
  project: ResearchProject,
  session: ResearchSession,
  messages: ResearchSessionMessage[]
): ResearchProject {
  const direction = getActiveDirection(session);
  const equilibriumResult = createEquilibriumFallbackForDirection(direction);

  return {
    ...project,
    equilibriumResult,
    researchSession: {
      ...session,
      phase: "analysis",
      messages,
      assetSummary: {
        ...session.assetSummary,
        equilibriumStatus: equilibriumResult.status,
        pendingDecision: {
          kind: "analyze_properties",
          prompt:
            "符号均衡资产已经生成。下一步可以对佣金、补贴、网络效应和差异化成本做符号性质分析。",
        },
        nextActions: [
          "检查符号均衡推导",
          "复制并运行 SymPy 求解代码",
          "基于解析对象生成性质分析",
          "生成性质分析",
        ],
      },
    },
  };
}

export function normalizeResearchProjectForWorkspace(
  project: ResearchProject
): ResearchProject {
  const workspaceProject = normalizeProjectSymbols(project);
  const session = workspaceProject.researchSession;

  if (
    session?.phase === "equilibrium" &&
    session.assetSummary.equilibriumStatus === "待推导解析解" &&
    workspaceProject.equilibriumResult?.status === "needs_revision" &&
    !workspaceProject.equilibriumResult.closedForm
  ) {
    return {
      ...workspaceProject,
      researchSession: {
        ...session,
        phase: "model",
        assetSummary: {
          ...session.assetSummary,
          equilibriumStatus: "等待开始求解",
          nextActions: [
            "确认需求份额和一阶条件",
            "点击开始符号求解后进入均衡求解阶段",
            "解析解完成后再进入性质分析",
          ],
          pendingDecision: {
            kind: "solve_equilibrium",
            prompt:
              "模型已确认。请检查需求份额、一阶条件和约束是否符合你的论文设定；确认后点击开始符号求解。",
          },
        },
      },
    };
  }

  return workspaceProject;
}

function normalizeProjectSymbols(project: ResearchProject): ResearchProject {
  if (!project.hotellingModel) return project;

  return {
    ...project,
    hotellingModel: {
      ...project.hotellingModel,
      symbols: normalizeSymbolRegistry(project.hotellingModel.symbols),
    },
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

function getActiveDirection(
  session: ResearchSession
): ResearchDirection | undefined {
  return session.assetSummary.currentDirection;
}

function isSellerMultihomingDirection(direction?: ResearchDirection): boolean {
  return direction?.id === SELLER_MULTIHOMING_ID;
}

export function createResearchSymbolRegistryForDirection(
  direction?: ResearchDirection
): SymbolDefinition[] {
  const coreSymbols = createHotellingSymbolSeed();

  if (isSellerMultihomingDirection(direction)) {
    return mergeSymbolRegistries(coreSymbols, createSellerMultihomingSymbols());
  }

  if (direction && direction.id !== DEFAULT_ID) {
    return mergeSymbolRegistries(
      coreSymbols,
      createGenericDirectionSpecificSymbols(direction)
    );
  }

  return coreSymbols;
}

function createSellerMultihomingSymbols(): SymbolDefinition[] {
  return [
    createSymbolDraft({
      symbol: "p_A",
      baseSymbol: "p",
      subscript: "A",
      codeName: "p_A",
      name: "A-side price",
      meaning: "Buyer-side generalized price or payment on platform A.",
      role: "parameter",
      side: "platform",
      assumption: "positive",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: "p_B",
      baseSymbol: "p",
      subscript: "B",
      codeName: "p_B",
      name: "B-side price",
      meaning: "Buyer-side generalized price or payment on platform B.",
      role: "parameter",
      side: "platform",
      assumption: "positive",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: "m_A",
      baseSymbol: "m",
      subscript: "A",
      codeName: "m_A",
      name: "A-only seller mass",
      meaning: "Mass of sellers who join only platform A.",
      role: "demand",
      side: "merchant",
      assumption: "in_[0,1]",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: "m_B",
      baseSymbol: "m",
      subscript: "B",
      codeName: "m_B",
      name: "B-only seller mass",
      meaning: "Mass of sellers who join only platform B.",
      role: "demand",
      side: "merchant",
      assumption: "in_[0,1]",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: "m_{AB}",
      baseSymbol: "m",
      subscript: "AB",
      codeName: "m_AB",
      name: "multihoming seller mass",
      meaning: "Mass of sellers who join both platforms A and B.",
      role: "demand",
      side: "merchant",
      assumption: "in_[0,1]",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: "m_i",
      baseSymbol: "m",
      subscript: "i",
      codeName: "m_i",
      name: "platform-visible seller mass",
      meaning: "Seller mass visible on platform i, including multihoming sellers.",
      role: "derived",
      side: "merchant",
      assumption: "nonnegative",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: "\\kappa",
      baseSymbol: "kappa",
      codeName: "kappa",
      name: "seller multihoming cost",
      meaning: "Fixed cost paid by a seller to maintain presence on both platforms.",
      role: "cost",
      side: "merchant",
      assumption: "nonnegative",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: "\\rho",
      baseSymbol: "rho",
      codeName: "rho",
      name: "shared seller visibility effect",
      meaning: "Extra buyer-side value created by sellers available on both platforms.",
      role: "parameter",
      side: "consumer",
      assumption: "real",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "C_A",
      baseSymbol: "C",
      subscript: "A",
      codeName: "C_A",
      name: "A-side governance cost",
      meaning: "Symbolic platform cost from onboarding, governing, or serving sellers on A.",
      role: "cost",
      side: "platform",
      assumption: "nonnegative",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "C_B",
      baseSymbol: "C",
      subscript: "B",
      codeName: "C_B",
      name: "B-side governance cost",
      meaning: "Symbolic platform cost from onboarding, governing, or serving sellers on B.",
      role: "cost",
      side: "platform",
      assumption: "nonnegative",
      recommended: false,
    }),
  ];
}

function createGenericDirectionSpecificSymbols(
  direction: ResearchDirection
): SymbolDefinition[] {
  const safeDirectionId = direction.id.replace(/[^A-Za-z0-9_]/g, "_");

  return [
    createSymbolDraft({
      symbol: `\\mu_{${safeDirectionId}}`,
      baseSymbol: "mu",
      subscript: safeDirectionId,
      codeName: `mu_${safeDirectionId}`,
      name: "direction-specific mechanism state",
      meaning: `Symbolic state variable for the ${direction.id} mechanism.`,
      role: "parameter",
      side: "global",
      assumption: "real",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: `a_{${safeDirectionId}}`,
      baseSymbol: "a",
      subscript: safeDirectionId,
      codeName: `a_${safeDirectionId}`,
      name: "direction-specific mechanism effort",
      meaning: `Platform choice or effort variable for the ${direction.id} mechanism.`,
      role: "decision",
      side: "platform",
      assumption: "real",
      recommended: true,
    }),
    createSymbolDraft({
      symbol: "p_A",
      baseSymbol: "p",
      subscript: "A",
      codeName: "p_A",
      name: "A-side price",
      meaning: `Buyer-side generalized price or payment on platform A in the ${direction.id} direction.`,
      role: "parameter",
      side: "platform",
      assumption: "positive",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "p_B",
      baseSymbol: "p",
      subscript: "B",
      codeName: "p_B",
      name: "B-side price",
      meaning: `Buyer-side generalized price or payment on platform B in the ${direction.id} direction.`,
      role: "parameter",
      side: "platform",
      assumption: "positive",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "psi_A",
      baseSymbol: "psi",
      subscript: "A",
      codeName: "psi_A",
      name: "A-side mechanism utility",
      meaning: `Direction-specific buyer-side mechanism utility on platform A for ${direction.id}.`,
      role: "utility",
      side: "consumer",
      assumption: "real",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "psi_B",
      baseSymbol: "psi",
      subscript: "B",
      codeName: "psi_B",
      name: "B-side mechanism utility",
      meaning: `Direction-specific buyer-side mechanism utility on platform B for ${direction.id}.`,
      role: "utility",
      side: "consumer",
      assumption: "real",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "phi_A",
      baseSymbol: "phi",
      subscript: "A",
      codeName: "phi_A",
      name: "A-side seller mechanism utility",
      meaning: `Direction-specific seller-side mechanism utility on platform A for ${direction.id}.`,
      role: "utility",
      side: "merchant",
      assumption: "real",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "phi_B",
      baseSymbol: "phi",
      subscript: "B",
      codeName: "phi_B",
      name: "B-side seller mechanism utility",
      meaning: `Direction-specific seller-side mechanism utility on platform B for ${direction.id}.`,
      role: "utility",
      side: "merchant",
      assumption: "real",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "R_A",
      baseSymbol: "R",
      subscript: "A",
      codeName: "R_A",
      name: "A-side mechanism revenue",
      meaning: `Symbolic platform revenue term created by the ${direction.id} mechanism on platform A.`,
      role: "derived",
      side: "platform",
      assumption: "real",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "R_B",
      baseSymbol: "R",
      subscript: "B",
      codeName: "R_B",
      name: "B-side mechanism revenue",
      meaning: `Symbolic platform revenue term created by the ${direction.id} mechanism on platform B.`,
      role: "derived",
      side: "platform",
      assumption: "real",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "C_A",
      baseSymbol: "C",
      subscript: "A",
      codeName: "C_A",
      name: "A-side mechanism cost",
      meaning: `Symbolic platform cost term created by the ${direction.id} mechanism on platform A.`,
      role: "cost",
      side: "platform",
      assumption: "nonnegative",
      recommended: false,
    }),
    createSymbolDraft({
      symbol: "C_B",
      baseSymbol: "C",
      subscript: "B",
      codeName: "C_B",
      name: "B-side mechanism cost",
      meaning: `Symbolic platform cost term created by the ${direction.id} mechanism on platform B.`,
      role: "cost",
      side: "platform",
      assumption: "nonnegative",
      recommended: false,
    }),
  ];
}

function createFallbackModelForDirection(
  direction?: ResearchDirection
): HotellingModel {
  if (!direction || direction.id === DEFAULT_ID) {
    return createSecondhandCommissionSubsidyModel(direction);
  }

  if (isSellerMultihomingDirection(direction)) {
    return createSellerMultihomingModel(direction);
  }

  return createGenericDirectionSpecificModel(direction);
}

function createEquilibriumFallbackForDirection(
  direction?: ResearchDirection
): EquilibriumResult {
  if (!direction || direction.id === DEFAULT_ID) {
    return createSymbolicHotellingFallbackResult();
  }

  if (isSellerMultihomingDirection(direction)) {
    return createSellerMultihomingEquilibriumFallback();
  }

  return createGenericDirectionSpecificEquilibriumFallback(direction);
}

function createPropertyAnalysesForDirection(
  direction: ResearchDirection | undefined,
  equilibrium: EquilibriumResult
): PropertyAnalysis[] {
  if (!direction || direction.id === DEFAULT_ID) {
    return createDefaultPropertyAnalyses(equilibrium);
  }

  if (isSellerMultihomingDirection(direction)) {
    return createSellerMultihomingPropertyAnalyses(equilibrium);
  }

  return createGenericDirectionSpecificPropertyAnalyses(direction, equilibrium);
}

function createSecondhandCommissionSubsidyModel(
  direction?: ResearchDirection
): HotellingModel {
  const selectedDirectionAssumption = direction && !direction.recommended
    ? `Selected research direction: ${direction.title}.`
    : null;
  const selectedDirectionDraft = direction
    ? `Selected direction: ${direction.title}. ${direction.summary} Model route: ${direction.model}. Contribution target: ${direction.contribution}. The local fallback keeps this direction inside a symbolic two-sided Hotelling scaffold so the user can refine the direction-specific mechanism before equilibrium solving.`
    : null;
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
    symbols: createResearchSymbolRegistryForDirection(direction),
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
      ...(selectedDirectionAssumption ? [selectedDirectionAssumption] : []),
    ],
    modelSetupDraft:
      selectedDirectionDraft ??
      "考虑两个竞争性二手交易平台 A 与 B。平台通过卖家佣金和买家补贴影响双边参与规模，并在跨边网络效应下形成策略互动。",
  };
}

function createSellerMultihomingModel(direction?: ResearchDirection): HotellingModel {
  const utilityFunctions: UtilityFunction[] = [
    {
      id: "u-buyer-a-multihoming",
      side: "consumer",
      platform: "A",
      expression:
        "U_A^B = v_B + \\alpha_B(m_A+m_{AB}) + \\rho m_{AB} - p_A - t_B x",
      notes:
        "Buyer utility on platform A depends on A-exclusive sellers m_A and shared multihoming sellers m_{AB}.",
    },
    {
      id: "u-buyer-b-multihoming",
      side: "consumer",
      platform: "B",
      expression:
        "U_B^B = v_B + \\alpha_B(m_B+m_{AB}) + \\rho m_{AB} - p_B - t_B(1-x)",
      notes:
        "Buyer utility on platform B uses the same seller multihoming stock, keeping the buyer side single-homing.",
    },
    {
      id: "u-seller-a-membership",
      side: "merchant",
      platform: "A",
      expression:
        "U_A^S = v_S + \\alpha_S n_A^B - \\tau_A q n_A^B - t_S y",
      notes:
        "A-only seller surplus uses the platform A buyer mass and the transaction commission paid on expected matches.",
    },
    {
      id: "u-seller-b-membership",
      side: "merchant",
      platform: "B",
      expression:
        "U_B^S = v_S + \\alpha_S n_B^B - \\tau_B q n_B^B - t_S(1-y)",
      notes:
        "B-only seller surplus mirrors the A-only membership equation.",
    },
    {
      id: "u-seller-ab-membership",
      side: "merchant",
      platform: "AB",
      expression: "U_{AB}^S = U_A^S + U_B^S - \\kappa",
      notes:
        "The multihoming option combines platform surplus and subtracts the symbolic multihoming fixed cost kappa.",
    },
  ];

  return {
    symbols: createResearchSymbolRegistryForDirection(direction),
    sides: {
      consumerSideName: "buyers",
      merchantSideName: "sellers",
    },
    platforms: ["A", "B"],
    timing: [
      {
        id: "stage-platform-pricing",
        order: 1,
        name: "Platforms choose symbolic commissions",
        decisions: ["\\tau_A", "\\tau_B"],
      },
      {
        id: "stage-seller-membership",
        order: 2,
        name: "Sellers choose A-only, B-only, or multihoming",
        decisions: ["m_A", "m_B", "m_{AB}", "m_i", "\\kappa"],
      },
      {
        id: "stage-buyer-choice",
        order: 3,
        name: "Buyers single-home after observing seller availability",
        decisions: ["n_A^B", "n_B^B", "x"],
      },
    ],
    utilityFunctions,
    demandDerivation:
      "Buyer demand follows U_A^B=U_B^B. Seller membership is pinned down by symbolic cutoff or complementarity equations U_A^S,U_B^S,U_{AB}^S with multihoming cost \\kappa; the system is kept symbolic.",
    profitFunctions: [
      {
        id: "profit-a-multihoming",
        platform: "A",
        expression:
          "Pi_A = \\tau_A q n_A^B(m_A+m_{AB}) - C_A(m_A,m_{AB})",
        notes:
          "Platform A earns commission revenue from A-visible sellers, including multihoming sellers, net of symbolic onboarding or governance costs.",
      },
      {
        id: "profit-b-multihoming",
        platform: "B",
        expression:
          "Pi_B = \\tau_B q n_B^B(m_B+m_{AB}) - C_B(m_B,m_{AB})",
        notes:
          "Platform B mirrors A but keeps seller multihoming mass explicit rather than collapsing to the commission-subsidy model.",
      },
    ],
    assumptions: [
      "Buyers single-home between platforms A and B, while sellers may choose A-only, B-only, or multihoming.",
      "m_A, m_B, and m_{AB} are symbolic seller membership masses; m_i denotes the seller mass visible on platform i.",
      "The multihoming cost \\kappa is kept symbolic and enters seller participation before platform FOCs are solved.",
      "Platform profits are written with seller availability masses rather than the commission-subsidy term tau_i q n_i^S n_i^B - s_i n_i^B.",
      "Equilibrium and property analysis must use symbolic FOCs, reaction functions, or implicit-function comparative statics, not numerical simulation.",
    ],
    modelSetupDraft:
      `Selected direction: ${direction?.title ?? "seller multihoming pricing"}. ` +
      "This direction-specific fallback models seller multihoming with membership masses m_A, m_B, m_{AB}, platform-visible seller mass m_i, and symbolic multihoming cost \\kappa. " +
      "Platforms choose commissions \\tau_A and \\tau_B; sellers then decide whether to join A, B, or both platforms. " +
      "The fallback intentionally avoids reusing the commission-subsidy Hotelling profit system so the later symbolic solve can focus on seller-multihoming-pricing.",
  };
}

function createGenericDirectionSpecificModel(direction: ResearchDirection): HotellingModel {
  const directionSlug = direction.id;
  const mechanismState = `\\mu_{${directionSlug}}`;
  const mechanismEffort = `a_{${directionSlug}}`;
  const utilityFunctions: UtilityFunction[] = [
    {
      id: `u-buyer-a-${directionSlug}`,
      side: "consumer",
      platform: "A",
      expression:
        `U_A^B = v_B + \\alpha_B n_A^S + \\psi_A(${mechanismState}) - p_A - t_B x`,
      notes:
        `Buyer utility on platform A keeps the ${directionSlug} mechanism as a symbolic quality or policy state.`,
    },
    {
      id: `u-buyer-b-${directionSlug}`,
      side: "consumer",
      platform: "B",
      expression:
        `U_B^B = v_B + \\alpha_B n_B^S + \\psi_B(${mechanismState}) - p_B - t_B(1-x)`,
      notes:
        `Buyer utility on platform B mirrors the same direction-specific symbolic mechanism.`,
    },
    {
      id: `u-seller-a-${directionSlug}`,
      side: "merchant",
      platform: "A",
      expression:
        `U_A^S = v_S + \\alpha_S n_A^B + \\phi_A(${mechanismState}) - \\tau_A q - t_S y`,
      notes:
        "Seller utility keeps the mechanism payoff symbolic so the direction can be solved without numerical substitution.",
    },
    {
      id: `u-seller-b-${directionSlug}`,
      side: "merchant",
      platform: "B",
      expression:
        `U_B^S = v_S + \\alpha_S n_B^B + \\phi_B(${mechanismState}) - \\tau_B q - t_S(1-y)`,
      notes:
        "The B-side seller utility mirrors A and leaves the direction-specific channel explicit.",
    },
  ];

  return {
    symbols: createResearchSymbolRegistryForDirection(direction),
    sides: {
      consumerSideName: "buyers",
      merchantSideName: "sellers",
    },
    platforms: ["A", "B"],
    timing: [
      {
        id: `stage-mechanism-${directionSlug}`,
        order: 1,
        name: "Platforms choose direction-specific mechanism variables",
        decisions: ["\\tau_A", "\\tau_B", mechanismEffort, mechanismState],
      },
      {
        id: `stage-participation-${directionSlug}`,
        order: 2,
        name: "Buyers and sellers choose platforms after observing the mechanism",
        decisions: ["n_A^B", "n_B^B", "n_A^S", "n_B^S", "x", "y"],
      },
    ],
    utilityFunctions,
    demandDerivation:
      `Demand is derived from U_A^B=U_B^B and U_A^S=U_B^S while keeping the ${directionSlug} mechanism state symbolic. The local fallback does not collapse this direction to the commission-subsidy Hotelling closed form.`,
    profitFunctions: [
      {
        id: `profit-a-${directionSlug}`,
        platform: "A",
        expression:
          `Pi_A = \\tau_A q n_A^S n_A^B + R_A(${mechanismState},n_A^B,n_A^S) - C_A(${mechanismEffort})`,
        notes:
          "Platform A profit keeps mechanism revenue and cost channels symbolic for later closed-form or implicit solving.",
      },
      {
        id: `profit-b-${directionSlug}`,
        platform: "B",
        expression:
          `Pi_B = \\tau_B q n_B^S n_B^B + R_B(${mechanismState},n_B^B,n_B^S) - C_B(${mechanismEffort})`,
        notes:
          "Platform B mirrors A, preserving the direction-specific mechanism rather than importing the default subsidy term.",
      },
    ],
    assumptions: [
      `Selected research direction: ${direction.title}.`,
      `Direction id ${direction.id} is handled by a direction-specific symbolic fallback.`,
      "Mechanism variables remain symbolic until the user or model generation step confirms the exact economic channel.",
      "Equilibrium analysis must use symbolic FOCs, reaction functions, or implicit-function comparative statics.",
      "Numerical substitution or simulation is not used as a substitute for theoretical analysis.",
    ],
    modelSetupDraft:
      `Selected direction: ${direction.title}. ${direction.summary} Model route: ${direction.model}. Contribution target: ${direction.contribution}. ` +
      `This direction-specific fallback introduces symbolic mechanism variables ${mechanismState} and ${mechanismEffort}, then keeps demand, profit, FOCs, and property analysis tied to ${direction.id} instead of reusing the commission-subsidy closed form.`,
  };
}

function createSymbolicEquilibriumScaffold(
  direction?: ResearchDirection
): EquilibriumResult {
  if (isSellerMultihomingDirection(direction)) {
    return {
      ...createSymbolicEquilibriumScaffoldResult(),
      concept: "seller-multihoming-pricing direction-specific symbolic scaffold",
      solvingSteps: [
        "Define buyer single-homing shares n_A^B,n_B^B and seller membership masses m_A,m_B,m_{AB}.",
        "Write seller membership surplus for A-only, B-only, and multihoming choices with multihoming cost \\kappa.",
        "Substitute seller masses into platform profits before writing FOCs in \\tau_A and \\tau_B.",
        "Keep this as a symbolic system until the multihoming participation rule is confirmed.",
      ],
      focs: [
        "\\frac{\\partial \\Pi_A}{\\partial \\tau_A}=0",
        "\\frac{\\partial \\Pi_B}{\\partial \\tau_B}=0",
        "G_m(m_A,m_B,m_{AB};\\tau_A,\\tau_B,\\kappa)=0",
      ],
      conditions: [
        "\\kappa \\ge 0",
        "m_A,m_B,m_{AB}\\in[0,1]",
        "n_A^B+n_B^B=1",
      ],
      derivation:
        "This scaffold is direction-specific for seller-multihoming-pricing and does not reuse the commission-subsidy Hotelling closed form.",
      warnings: [
        "Direction-specific seller multihoming scaffold only; no numerical substitution or simulation is used.",
      ],
    };
  }

  return createSymbolicEquilibriumScaffoldResult();
}

export function createSymbolicEquilibriumScaffoldResult(): EquilibriumResult {
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

function createSymbolicHotellingFallbackResult(): EquilibriumResult {
  return {
    status: "solved",
    concept: "对称内部纳什均衡（符号闭式 fallback）",
    solvingSteps: [
      "由买家无差异条件 U_A^B=U_B^B 得到买家侧平台 A 份额 n_A^B。",
      "由卖家无差异条件 U_A^S=U_B^S 得到卖家侧平台 A 份额 n_A^S。",
      "令 D=t_Bt_S-\\alpha_B\\alpha_S，并把 n_i^B 与 n_i^S 代入平台利润函数 \\Pi_i=\\tau_i q n_i^S n_i^B-s_i n_i^B。",
      "在对称内部候选均衡 \\tau_A=\\tau_B=\\tau, s_A=s_B=s 下整理一阶条件。",
      "联立对称一阶条件得到闭式 \\tau^* 与 s^*，再列出内部解和局部二阶条件。",
    ],
    focs: [
      "D-q\\tau(t_B+\\alpha_B)+2\\alpha_B s=0",
      "q\\tau(t_S+\\alpha_S)-2D-2t_Ss=0",
      "D=t_Bt_S-\\alpha_B\\alpha_S",
    ],
    conditions: [
      "D=t_Bt_S-\\alpha_B\\alpha_S>0，保证两侧需求反馈可解。",
      "\\tau^*=(t_S-2\\alpha_B)/q；若论文要求卖家佣金非负，需要 t_S\\ge 2\\alpha_B。",
      "s^*=(t_S+\\alpha_S-2t_B-2\\alpha_B)/2；若论文要求买家补贴非负，需要 t_S+\\alpha_S\\ge 2(t_B+\\alpha_B)。",
      "对称候选给出 n_A^{B*}=n_A^{S*}=1/2；内部解还需满足局部二阶条件。",
      "局部二阶条件可用 Hessian 负定检验：\\Pi_{\\tau\\tau}<0 且 \\det(H)>0。",
    ],
    closedForm:
      "在对称内部均衡中：$\\tau_A^*=\\tau_B^*=\\frac{t_S-2\\alpha_B}{q}$，$s_A^*=s_B^*=\\frac{t_S+\\alpha_S-2t_B-2\\alpha_B}{2}$，且 $n_A^{B*}=n_B^{B*}=n_A^{S*}=n_B^{S*}=\\frac{1}{2}$。",
    derivation:
      "由买家无差异条件和卖家无差异条件可得 $n_A^B=\\frac{1}{2}+\\frac{t_S\\Delta s-\\alpha_B q\\Delta\\tau}{2D}$，$n_A^S=\\frac{1}{2}+\\frac{\\alpha_S\\Delta s-qt_B\\Delta\\tau}{2D}$，其中 $\\Delta s=s_A-s_B$，$\\Delta\\tau=\\tau_A-\\tau_B$，$D=t_Bt_S-\\alpha_B\\alpha_S$。代入 $\\Pi_A=\\tau_A q n_A^Sn_A^B-s_A n_A^B$ 后，在对称候选 $\\tau_A=\\tau_B=\\tau$、$s_A=s_B=s$ 处，一阶条件化为 $D-q\\tau(t_B+\\alpha_B)+2\\alpha_Bs=0$ 和 $q\\tau(t_S+\\alpha_S)-2D-2t_Ss=0$。联立解得 $\\tau^*=(t_S-2\\alpha_B)/q$，$s^*=(t_S+\\alpha_S-2t_B-2\\alpha_B)/2$。该 fallback 只声明对称内部闭式解；若研究方向需要非对称或多机制扩展，应继续调用模型生成链路做一般符号求解。",
    code: `# sympy symbolic symmetric equilibrium
import sympy as sp

tau_A, tau_B, s_A, s_B, tau, s, q = sp.symbols(
    "tau_A tau_B s_A s_B tau s q", positive=True
)
t_B, t_S = sp.symbols("t_B t_S", positive=True)
alpha_B, alpha_S = sp.symbols("alpha_B alpha_S", real=True)
nA_B, nA_S = sp.symbols("nA_B nA_S", real=True)

nB_B = 1 - nA_B
nB_S = 1 - nA_S

buyer_indifference = sp.Eq(
    nA_B,
    (t_B + s_A - s_B + alpha_B * (nA_S - nB_S)) / (2 * t_B),
)
seller_indifference = sp.Eq(
    nA_S,
    (t_S - q * (tau_A - tau_B) + alpha_S * (nA_B - nB_B)) / (2 * t_S),
)

demand_solution = sp.solve(
    [buyer_indifference, seller_indifference],
    [nA_B, nA_S],
    dict=True,
    simplify=True,
)

nA_B_expr = sp.simplify(demand_solution[0][nA_B])
nA_S_expr = sp.simplify(demand_solution[0][nA_S])
Pi_A = tau_A * q * nA_S_expr * nA_B_expr - s_A * nA_B_expr

foc_tau_sym = sp.factor(
    sp.diff(Pi_A, tau_A).subs({tau_A: tau, tau_B: tau, s_A: s, s_B: s})
)
foc_s_sym = sp.factor(
    sp.diff(Pi_A, s_A).subs({tau_A: tau, tau_B: tau, s_A: s, s_B: s})
)
symmetric_solution = sp.solve(
    [foc_tau_sym, foc_s_sym],
    [tau, s],
    dict=True,
    simplify=True,
)

print("nA_B =", nA_B_expr)
print("nA_S =", nA_S_expr)
print("symmetric FOC_tau =", foc_tau_sym)
print("symmetric FOC_s =", foc_s_sym)
print("symmetric solution =", symmetric_solution)`,
    warnings: [
      "当前 fallback 给出的是对称内部闭式解，不声称覆盖一般非对称均衡。",
      "均衡求解阶段不使用数值模拟；数值代入只应出现在后续仿真模块。",
      "如果继续加入非对称平台、质量验证努力或多期状态变量，应重新做一般符号求解。",
    ],
  };
}

function createSellerMultihomingEquilibriumFallback(): EquilibriumResult {
  return {
    status: "symbolic_failure",
    concept:
      "seller-multihoming-pricing direction-specific symbolic equilibrium scaffold",
    solvingSteps: [
      "Start from buyer indifference U_A^B=U_B^B to obtain n_A^B as a symbolic function of m_A,m_B,m_{AB}.",
      "Represent seller membership with cutoff or complementarity equations G_A=0,G_B=0,G_{AB}=0, where \\kappa shifts the multihoming equation.",
      "Substitute n_i^B and m_i=m_i^{only}+m_{AB} into \\Pi_i=\\tau_i q n_i^B m_i-C_i(m_i,m_{AB}).",
      "Write platform FOCs \\partial \\Pi_A/\\partial \\tau_A=0 and \\partial \\Pi_B/\\partial \\tau_B=0 without imposing the commission-subsidy closed form.",
      "Use the implicit system F(z,\\theta)=0 for z=(\\tau_A,\\tau_B,m_A,m_B,m_{AB}) when a compact closed form is algebraically unavailable.",
    ],
    focs: [
      "F_A=\\frac{\\partial}{\\partial \\tau_A}[\\tau_A q n_A^B(m_A+m_{AB})-C_A(m_A,m_{AB})]=0",
      "F_B=\\frac{\\partial}{\\partial \\tau_B}[\\tau_B q n_B^B(m_B+m_{AB})-C_B(m_B,m_{AB})]=0",
      "G_{AB}=U_A^S+U_B^S-\\kappa-U_0^S=0",
      "G_A-G_{AB}\\le 0,\\quad G_B-G_{AB}\\le 0 \\quad \\text{when multihoming is active}",
    ],
    conditions: [
      "\\kappa\\ge 0",
      "m_A,m_B,m_{AB}\\in[0,1]",
      "n_A^B+n_B^B=1",
      "\\det J_zF \\ne 0 \\quad \\text{for implicit symbolic comparative statics}",
      "Second-order conditions use the symbolic Hessian of \\Pi_i after seller membership is substituted.",
    ],
    closedForm:
      "Closed form is not asserted for seller-multihoming-pricing fallback. Use the symbolic reaction system F_A=F_B=G_A=G_B=G_{AB}=0 and solve under stated parameter restrictions.",
    derivation:
      "This direction-specific seller multihoming fallback keeps m_A,m_B,m_{AB},m_i and \\kappa inside the symbolic system. Because seller membership creates complementarity and cutoff equations, the local fallback returns a symbolic_failure asset with FOCs, conditions, and reusable SymPy structure instead of reusing the commission-subsidy closed form. The result is still theoretical: all comparative statics should come from the implicit system F(z,\\theta)=0, not from numerical substitution.",
    code: `# sympy scaffold for seller-multihoming-pricing
import sympy as sp

tau_A, tau_B, q = sp.symbols("tau_A tau_B q", positive=True)
t_B, alpha_B, alpha_S, rho, kappa = sp.symbols(
    "t_B alpha_B alpha_S rho kappa", real=True
)
m_A, m_B, m_AB = sp.symbols("m_A m_B m_AB", real=True)
C_A, C_B = sp.symbols("C_A C_B", cls=sp.Function)

nA_B = sp.Rational(1, 2) + (
    alpha_B * (m_A - m_B) + rho * m_AB
) / (2 * t_B)
nB_B = 1 - nA_B

visible_A = m_A + m_AB
visible_B = m_B + m_AB
Pi_A = tau_A * q * nA_B * visible_A - C_A(m_A, m_AB)
Pi_B = tau_B * q * nB_B * visible_B - C_B(m_B, m_AB)

F_tau_A = sp.diff(Pi_A, tau_A)
F_tau_B = sp.diff(Pi_B, tau_B)
G_AB = alpha_S * (nA_B + nB_B) - q * (tau_A * nA_B + tau_B * nB_B) - kappa

system = [F_tau_A, F_tau_B, G_AB]
unknowns = [tau_A, tau_B, m_A, m_B, m_AB]
implicit_jacobian = sp.Matrix(system).jacobian(unknowns)

print("nA_B =", sp.factor(nA_B))
print("F_tau_A =", sp.factor(F_tau_A))
print("F_tau_B =", sp.factor(F_tau_B))
print("G_AB =", sp.factor(G_AB))
print("Jacobian block =", implicit_jacobian)`,
    warnings: [
      "Direction-specific symbolic_failure: seller-multihoming-pricing has an implicit symbolic system, not the commission-subsidy closed form.",
      "Do not report numerical equilibrium values for this fallback; complete the symbolic cutoff/complementarity solve first.",
      "Comparative statics must use F_z^{-1}F_\\theta or closed-form reaction functions derived from this direction-specific system.",
    ],
  };
}

function createGenericDirectionSpecificEquilibriumFallback(
  direction: ResearchDirection | undefined
): EquilibriumResult {
  const directionId = direction?.id ?? "custom-direction";
  const mechanismState = `\\mu_{${directionId}}`;
  const mechanismEffort = `a_{${directionId}}`;

  return {
    status: "symbolic_failure",
    concept: `${directionId} direction-specific symbolic equilibrium scaffold`,
    solvingSteps: [
      `Keep ${mechanismState} and ${mechanismEffort} in the buyer and seller utility functions rather than replacing them with the default commission-subsidy channel.`,
      "Derive n_A^B and n_A^S from symbolic indifference equations U_A^B=U_B^B and U_A^S=U_B^S.",
      "Substitute the symbolic demand system into Pi_A and Pi_B, including mechanism revenue R_i and cost C_i terms.",
      "Write platform FOCs with respect to commissions and the direction-specific mechanism variable.",
      "Use implicit equations F(z,theta)=0 when a compact closed form is not available.",
    ],
    focs: [
      "\\frac{\\partial \\Pi_i}{\\partial \\tau_i}=0",
      `\\frac{\\partial \\Pi_i}{\\partial ${mechanismEffort}}=0`,
      `G_{${directionId}}(${mechanismState},${mechanismEffort},n_i^B,n_i^S;\\theta)=0`,
    ],
    conditions: [
      "n_i^B,n_i^S\\in[0,1]",
      "\\det J_zF\\ne0 \\quad \\text{for implicit comparative statics}",
      `The ${directionId} mechanism constraints must define the active symbolic regime before claiming a closed form.`,
    ],
    closedForm:
      `Closed form is not asserted for ${directionId}. Use the direction-specific symbolic reaction system F(z,\\theta)=0 and solve after the mechanism equations are confirmed.`,
    derivation:
      `This direction-specific fallback for ${directionId} returns symbolic_failure because the local deterministic engine cannot honestly derive a complete closed-form equilibrium for this mechanism yet. It preserves symbolic FOCs, mechanism variables, and implicit-function structure instead of reusing the commission-subsidy Hotelling closed form. No numerical substitution or simulation is used.`,
    code: `# sympy scaffold for ${directionId}
import sympy as sp

tau_A, tau_B, q = sp.symbols("tau_A tau_B q", positive=True)
t_B, t_S = sp.symbols("t_B t_S", positive=True)
alpha_B, alpha_S = sp.symbols("alpha_B alpha_S", real=True)
mu, a = sp.symbols("mu a", real=True)
nA_B, nA_S = sp.symbols("nA_B nA_S", real=True)
R_A, C_A = sp.symbols("R_A C_A", cls=sp.Function)

nB_B = 1 - nA_B
nB_S = 1 - nA_S

buyer_indifference = sp.Eq(
    nA_B,
    (t_B + alpha_B * (nA_S - nB_S) + sp.Function("psi_A")(mu) - sp.Function("psi_B")(mu)) / (2 * t_B),
)
seller_indifference = sp.Eq(
    nA_S,
    (t_S - q * (tau_A - tau_B) + alpha_S * (nA_B - nB_B) + sp.Function("phi_A")(mu) - sp.Function("phi_B")(mu)) / (2 * t_S),
)

Pi_A = tau_A * q * nA_S * nA_B + R_A(mu, nA_B, nA_S) - C_A(a)
F_tau_A = sp.diff(Pi_A, tau_A)
F_a = sp.diff(Pi_A, a)
mechanism_constraint = sp.Function("G_${directionId.replace(/[^A-Za-z0-9_]/g, "_")}")(
    mu, a, nA_B, nA_S
)

print("buyer indifference =", buyer_indifference)
print("seller indifference =", seller_indifference)
print("F_tau_A =", F_tau_A)
print("F_a =", F_a)
print("mechanism constraint =", mechanism_constraint)`,
    warnings: [
      `Direction-specific symbolic_failure: ${directionId} needs its own mechanism equations before a closed-form equilibrium can be claimed.`,
      "The deterministic fallback deliberately avoids the default commission-subsidy closed form for this non-default direction.",
      "Continue with symbolic reaction functions or implicit differentiation; do not use numerical substitution as theory.",
    ],
  };
}

function createSellerMultihomingPropertyAnalyses(
  equilibrium: EquilibriumResult
): PropertyAnalysis[] {
  const sharedWarnings = [
    "Direction-specific seller multihoming property analysis uses symbolic implicit differentiation only.",
    "No numerical substitution, simulation, calibration, or parameter assignment is used as theory.",
    "Signs require the stated Jacobian and second-order conditions from the seller-multihoming-pricing system.",
  ];

  return [
    {
      id: "analysis-multihoming-cost-membership",
      target: "m_i^*, m_{AB}^*",
      parameter: "kappa (\\kappa)",
      operation: "differentiate",
      symbolicResult:
        "\\frac{\\partial z^*}{\\partial \\kappa}=-J_zF(z^*,\\theta)^{-1}F_{\\kappa}(z^*,\\theta),\\quad z=(\\tau_A,\\tau_B,m_A,m_B,m_{AB})",
      signCondition:
        "If the active seller multihoming equation satisfies G_{AB,\\kappa}<0 and the reduced seller membership block is stable, then \\partial m_{AB}^*/\\partial \\kappa<0.",
      propositionDraft:
        "Proposition 1: A higher seller multihoming cost kappa weakly reduces the equilibrium multihoming mass m_{AB}^* in the active interior multihoming region.",
      proofSketch:
        `Use ${equilibrium.concept} and write the active symbolic system as F(z,\\theta)=0. Differentiating with respect to kappa gives J_zF dz^*/d\\kappa + F_\\kappa=0, hence dz^*/d\\kappa=-J_zF^{-1}F_\\kappa. The sign of the m_AB component follows from the seller membership block and the maintained stability condition; no numeric parameter values are introduced.`,
      intuition:
        "A larger kappa makes the both-platform seller option less attractive, so seller multihoming falls unless platform commission reactions fully offset the extra membership cost.",
      warnings: sharedWarnings,
    },
    {
      id: "analysis-multihoming-commission-pressure",
      target: "\\tau_i^*",
      parameter: "m_i",
      operation: "custom",
      symbolicResult:
        "\\frac{\\partial \\tau_i^*}{\\partial m_i}=-\\frac{F_{i,m_i}}{F_{i,\\tau_i}}\\quad \\text{on the reduced reaction equation }F_i(\\tau_i,m_i;\\theta)=0",
      signCondition:
        "When F_{i,\\tau_i}<0 and seller availability raises buyer demand but lowers seller lock-in, the sign is governed by the symbolic cross-partial F_{i,m_i}.",
      propositionDraft:
        "Proposition 2: Seller multihoming changes commission pressure through the reaction-function cross-partial between visible seller mass m_i and platform commission \\tau_i.",
      proofSketch:
        "After substituting the seller membership equations, reduce platform i's FOC to F_i=0. Symbolically differentiating F_i with respect to m_i yields d\\tau_i^*/dm_i=-F_{i,m_i}/F_{i,\\tau_i}. This is a theoretical comparative static expressed by derivatives of the symbolic FOC, not by a numerical experiment.",
      intuition:
        "More visible sellers increase buyer-side value, but multihoming also makes sellers less captive. The commission response therefore depends on which symbolic channel dominates in the reduced FOC.",
      warnings: sharedWarnings,
    },
    {
      id: "analysis-multihoming-existence-region",
      target: "seller multihoming interior equilibrium",
      parameter: "J_zF, \\kappa",
      operation: "threshold",
      symbolicResult:
        "\\det J_zF\\ne0,\\quad 0<m_A^*,m_B^*,m_{AB}^*<1,\\quad U_{AB}^S-U_A^S\\ge0,\\quad U_{AB}^S-U_B^S\\ge0",
      signCondition:
        "The symbolic interior region requires nonzero Jacobian determinant, feasible seller masses, and multihoming surplus inequalities that include kappa.",
      propositionDraft:
        "Proposition 3: The seller-multihoming-pricing fallback is valid only on the symbolic parameter region where the active multihoming constraints and local second-order conditions hold.",
      proofSketch:
        "List the feasibility inequalities for seller membership masses and the active multihoming surplus comparisons. Then combine them with \\det J_zF\\ne0 and the platform Hessian conditions. These symbolic restrictions define the theoretical region for property analysis before any numerical calibration is considered.",
      intuition:
        "The analysis should state where seller multihoming is actually active. Outside that region, the model switches to A-only or B-only seller membership and must be solved as a different symbolic regime.",
      warnings: sharedWarnings,
    },
  ];
}

function createGenericDirectionSpecificPropertyAnalyses(
  direction: ResearchDirection | undefined,
  equilibrium: EquilibriumResult
): PropertyAnalysis[] {
  const directionId = direction?.id ?? "custom-direction";
  const sharedWarnings = [
    `Direction-specific property analysis for ${directionId} uses symbolic implicit differentiation only.`,
    "No numerical substitution, simulation, calibration, or parameter assignment is used as theory.",
    "Signs are conditional on the mechanism equations, Jacobian rank, and second-order conditions.",
  ];

  return [
    {
      id: `analysis-${directionId}-mechanism`,
      target: `\\mu_{${directionId}}^*`,
      parameter: `a_{${directionId}}`,
      operation: "differentiate",
      symbolicResult:
        "\\frac{\\partial z^*}{\\partial a}=-J_zF(z^*,\\theta)^{-1}F_a(z^*,\\theta)",
      signCondition:
        `The sign depends on the ${directionId} mechanism cross-partials in F_a and the inverse symbolic Jacobian J_zF^{-1}.`,
      propositionDraft:
        `Proposition 1: In the ${directionId} regime, the mechanism variable changes equilibrium outcomes through the symbolic reaction system rather than the default commission-subsidy closed form.`,
      proofSketch:
        `Use ${equilibrium.concept}. Write the active equations as F(z,\\theta)=0 with z collecting commissions, demand shares, and the ${directionId} mechanism state. Differentiating with respect to the mechanism variable gives dz^*/da=-J_zF^{-1}F_a. This is symbolic comparative statics and does not assign parameter values.`,
      intuition:
        `The ${directionId} mechanism changes participation incentives directly, so its theoretical effect must be read from FOCs and mechanism constraints.`,
      warnings: sharedWarnings,
    },
    {
      id: `analysis-${directionId}-existence`,
      target: `${directionId} symbolic equilibrium regime`,
      parameter: "J_zF",
      operation: "threshold",
      symbolicResult:
        "\\det J_zF\\ne0,\\quad n_i^B,n_i^S\\in[0,1],\\quad \\text{active mechanism constraints hold}",
      signCondition:
        "The fallback is valid only inside the symbolic region where feasibility and active-regime constraints are satisfied.",
      propositionDraft:
        `Proposition 2: The ${directionId} fallback defines a symbolic regime; closed-form claims require first proving feasibility, active constraints, and local optimality.`,
      proofSketch:
        "Collect feasibility inequalities, active mechanism constraints, nonzero Jacobian determinant, and Hessian or bordered-Hessian conditions. These symbolic restrictions delimit the theorem region before any simulation module is considered.",
      intuition:
        "A mechanism-specific direction can switch regimes when constraints bind, so property analysis must state the symbolic region before reporting signs.",
      warnings: sharedWarnings,
    },
  ];
}

function createDefaultPropertyAnalyses(
  equilibrium: EquilibriumResult
): PropertyAnalysis[] {
  const sharedWarnings = [
    "性质分析基于对称内部闭式解和内部解条件，不使用数值模拟。",
    "若后续扩展到非对称平台或多机制模型，需要重新做一般符号求解后再更新比较静态。",
  ];

  return [
    {
      id: "analysis-reaction-network",
      target: "\\tau_i^*",
      parameter: "\\alpha_B",
      operation: "differentiate",
      symbolicResult:
        "\\frac{\\partial \\tau_i^*}{\\partial \\alpha_B}=-\\frac{2}{q}",
      signCondition:
        "q>0 时，买家侧跨边网络效应增强会降低对称均衡佣金。",
      propositionDraft:
        "命题 1：在对称内部均衡中，买家侧跨边网络效应增强会降低平台卖家佣金。",
      proofSketch:
        `由 ${equilibrium.concept} 的闭式解 \\tau_i^*=(t_S-2\\alpha_B)/q 直接对 \\alpha_B 求偏导，得到 \\partial \\tau_i^*/\\partial \\alpha_B=-2/q。该分析不需要给参数赋值。`,
      intuition:
        "买家侧网络效应越强，平台越有动力通过降低卖家佣金来扩大卖家规模，从而间接提高买家侧效用。",
      warnings: sharedWarnings,
    },
    {
      id: "analysis-subsidy-commission-balance",
      target: "s_i^*",
      parameter: "\\alpha_S",
      operation: "differentiate",
      symbolicResult:
        "\\frac{\\partial s_i^*}{\\partial \\alpha_S}=\\frac{1}{2}",
      signCondition:
        "\\partial s_i^*/\\partial \\alpha_S>0，因此卖家侧网络效应增强会提高对称均衡买家补贴。",
      propositionDraft:
        "命题 2：在对称内部均衡中，卖家侧网络效应增强会提高平台对买家的补贴。",
      proofSketch:
        `由闭式解 s_i^*=(t_S+\\alpha_S-2t_B-2\\alpha_B)/2 直接对 \\alpha_S 求偏导，得到 1/2。该命题不需要给定任何数值参数。`,
      intuition:
        "卖家侧网络效应越强，吸引买家的边际价值越高，平台更愿意用买家补贴扩大买家参与并稳定双边规模。",
      warnings: sharedWarnings,
    },
    {
      id: "analysis-transport-threshold",
      target: "n_i^{B*}, n_i^{S*}",
      parameter: "t_B,t_S",
      operation: "threshold",
      symbolicResult:
        "n_i^{B*}=n_i^{S*}=\\frac{1}{2},\\quad D=t_Bt_S-\\alpha_B\\alpha_S>0",
      signCondition:
        "D>0 保证需求反馈系统可解；若再要求 \\tau_i^*\\ge0 与 s_i^*\\ge0，则需 t_S\\ge2\\alpha_B 且 t_S+\\alpha_S\\ge2(t_B+\\alpha_B)。",
      propositionDraft:
        "命题 3：对称内部均衡存在要求差异化成本足以约束跨边网络反馈，并满足收费或补贴符号约束。",
      proofSketch:
        "把 \\tau_i^* 与 s_i^* 代回需求份额，得到四侧份额均为 1/2；再由需求联立方程分母 D 得到反馈可解条件，由策略变量的非负要求得到额外阈值。",
      intuition:
        "如果网络效应过强或差异化过弱，用户会集中到某个平台，Hotelling 内部解就不再成立；因此性质分析必须先说明均衡所在的符号参数区域。",
      warnings: sharedWarnings,
    },
  ];
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
  if (!provider) {
    throw new Error("Model provider is required for own model source.");
  }
  if (!isModelSourceProvider(provider)) {
    throw new Error(
      "Only OpenAI and OpenAI-compatible model providers are supported."
    );
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
    value === "openai-compatible"
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
