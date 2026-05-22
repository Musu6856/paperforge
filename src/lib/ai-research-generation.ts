import type {
  EquilibriumResult,
  HotellingModel,
  ModelSourceMetadata,
  ModelSourceSettings,
  PropertyAnalysis,
  ResearchDirection,
  ResearchProject,
  ResearchSessionAssetSummary,
  ResearchSessionMessage,
  SymbolDefinition,
} from "./types";
import {
  adoptResearchDirection,
  createExplorationProject,
  createSymbolicEquilibriumScaffoldResult,
  generatePropertyAnalysis,
  generateSymbolicEquilibrium,
  createResearchSymbolRegistryForDirection,
} from "./research-session.ts";
import {
  createHotellingSymbolSeed,
  formatSymbolRegistryForPrompt,
  normalizeSymbolRegistry,
  validateSymbolGovernance,
} from "./symbol-governance.ts";

export type ResearchGenerationAction =
  | "discover_directions"
  | "build_model"
  | "solve_equilibrium"
  | "analyze_properties"
  | "continue_conversation";

export type ResearchGenerationRequest = {
  action: ResearchGenerationAction;
  rawIdea: string;
  selectedDirectionId?: string;
  userMessage?: string;
  modelSource?: ModelSourceMetadata;
  runtimeModelSource?: ModelSourceSettings;
  project?: ResearchProject;
};

export type ResearchGenerationResponse = {
  project: ResearchProject;
  usedFallback: boolean;
  assistantMessage: string;
  assetPatch?: ResearchAssetPatch;
};

export type ResearchAssetPatch = {
  kind: "update_model" | "update_equilibrium" | "update_properties";
  summary: string;
  changes: ResearchAssetPatchChange[];
};

export type ResearchAssetPatchChange = {
  target: string;
  op: "set" | "insert" | "remove";
  value?: JsonValue;
  reason?: string;
};

export type ResearchCompletionClient = {
  complete?: (messages: LlmMessage[]) => Promise<string>;
  now?: number;
  id?: string;
};

export type LlmMessage = {
  role: "developer" | "system" | "user";
  content: string;
};

type DiscoverPayload = {
  assistantMessage?: unknown;
  directions?: unknown;
};

type BuildModelPayload = {
  assistantMessage?: unknown;
  selectedDirectionId?: unknown;
  refinedIdea?: unknown;
  hotellingModel?: unknown;
  assetSummary?: unknown;
};

type EquilibriumPayload = {
  assistantMessage?: unknown;
  equilibriumResult?: unknown;
};

type PropertyAnalysisPayload = {
  assistantMessage?: unknown;
  propertyAnalysis?: unknown;
  propertyAnalyses?: unknown;
};

type ConversationPayload = {
  assistantMessage?: unknown;
  assetPatch?: unknown;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export async function generateResearchProject(
  request: ResearchGenerationRequest,
  client: ResearchCompletionClient = {}
): Promise<ResearchGenerationResponse> {
  if (request.action === "continue_conversation") {
    return continueConversation(request, client);
  }

  if (request.action === "discover_directions") {
    return discoverDirections(request, client);
  }

  if (request.action === "solve_equilibrium") {
    return solveEquilibrium(request, client);
  }

  if (request.action === "analyze_properties") {
    return analyzeProperties(request, client);
  }

  return buildModel(request, client);
}

async function continueConversation(
  request: ResearchGenerationRequest,
  client: ResearchCompletionClient
): Promise<ResearchGenerationResponse> {
  if (!request.project) {
    throw new Error("project is required for continue_conversation");
  }

  const userMessage = request.userMessage?.trim();
  if (!userMessage) {
    throw new Error("userMessage is required for continue_conversation");
  }

  const content = await tryComplete(
    client,
    createConversationPrompt(request.project, userMessage)
  );
  const payload = content ? (extractFirstJsonObject(content) as ConversationPayload | null) : null;
  const assistantMessage =
    parseText(payload?.assistantMessage) ??
    (payload
      ? createConversationFallbackMessage(request.project, userMessage)
      : parseText(content) ?? createConversationFallbackMessage(request.project, userMessage));
  const assetPatch =
    parseConversationAssetPatch(payload?.assetPatch) ??
    createConversationFallbackAssetPatch(request.project, userMessage);
  const usedFallback =
    !content || (payload !== null && !parseText(payload.assistantMessage));

  return {
    project: appendConversationMessages(
      request.project,
      userMessage,
      assistantMessage
    ),
    usedFallback,
    assistantMessage,
    ...(assetPatch ? { assetPatch } : {}),
  };
}

function parseConversationAssetPatch(
  value: unknown
): ResearchAssetPatch | null {
  if (!isRecord(value)) return null;

  const kind = parseConversationPatchKind(value.kind);
  const summary = parseText(value.summary);
  const changes = Array.isArray(value.changes)
    ? value.changes.map(parseConversationPatchChange)
    : null;

  if (!kind || !summary || !changes || changes.some((change) => !change)) {
    return null;
  }

  return {
    kind,
    summary,
    changes: changes as ResearchAssetPatchChange[],
  };
}

function parseConversationPatchChange(
  value: unknown
): ResearchAssetPatchChange | null {
  if (!isRecord(value)) return null;

  const target = parseText(value.target);
  const op = parseConversationPatchOperation(value.op);
  const reason = parseText(value.reason);
  if (!target || !op) return null;

  return {
    target,
    op,
    ...(Object.prototype.hasOwnProperty.call(value, "value")
      ? { value: value.value as JsonValue }
      : {}),
    ...(reason ? { reason } : {}),
  };
}

function parseConversationPatchKind(
  value: unknown
): ResearchAssetPatch["kind"] | null {
  if (
    value === "update_model" ||
    value === "update_equilibrium" ||
    value === "update_properties"
  ) {
    return value;
  }
  return null;
}

function parseConversationPatchOperation(
  value: unknown
): ResearchAssetPatchChange["op"] | null {
  if (value === "set" || value === "insert" || value === "remove") {
    return value;
  }
  return null;
}

export function extractFirstJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? text;
  const start = source.indexOf("{");

  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(source.slice(start, index + 1));
          return isRecord(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

async function discoverDirections(
  request: ResearchGenerationRequest,
  client: ResearchCompletionClient
): Promise<ResearchGenerationResponse> {
  const fallbackProject = createExplorationProject({
    id: client.id,
    rawIdea: request.rawIdea,
    now: client.now,
  });
  const fallbackWithModelSource = attachModelSource(
    fallbackProject,
    request.modelSource
  );

  const content = await tryComplete(client, createDiscoverPrompt(request.rawIdea));
  const payload = content ? (extractFirstJsonObject(content) as DiscoverPayload | null) : null;
  const directions = parseDirections(payload?.directions);
  const assistantMessage = parseText(payload?.assistantMessage);

  if (!directions || !assistantMessage) {
    logGenerationFallback("discover_directions", {
      hasContent: Boolean(content),
      payloadKeys: payload ? Object.keys(payload) : [],
      directionsValueType: Array.isArray(payload?.directions)
        ? "array"
        : typeof payload?.directions,
      assistantMessageType: typeof payload?.assistantMessage,
      contentPreview: content?.slice(0, 500),
    });

    return {
      project: fallbackWithModelSource,
      usedFallback: true,
      assistantMessage:
        fallbackWithModelSource.researchSession?.messages.at(-1)?.content ?? "",
    };
  }

  const messages: ResearchSessionMessage[] = [
    {
      id: "msg-user-initial",
      role: "user",
      content: request.rawIdea.trim(),
      createdAt: 0,
    },
    {
      id: "msg-assistant-directions",
      role: "assistant",
      content: assistantMessage,
      createdAt: 0,
    },
  ];

  return {
    project: {
      ...fallbackWithModelSource,
      refinedIdea: request.rawIdea.trim(),
      researchSession: {
        phase: "direction",
        directions,
        messages,
        assetSummary: {
          confirmedAssumptions: [],
          utilityFunctions: [],
          equilibriumStatus: "not_started",
          nextActions: ["选择一个研究方向"],
          pendingDecision: {
            kind: "choose_direction",
            prompt: "请选择一个研究方向，之后我会把它细化为可求解的模型。",
          },
        },
      },
    },
    usedFallback: false,
    assistantMessage,
  };
}

function attachModelSource(
  project: ResearchProject,
  modelSource: ModelSourceMetadata | undefined
): ResearchProject {
  return modelSource ? { ...project, modelSource } : project;
}

async function buildModel(
  request: ResearchGenerationRequest,
  client: ResearchCompletionClient
): Promise<ResearchGenerationResponse> {
  const baseProject =
    request.project ??
    createExplorationProject({
      id: client.id,
      rawIdea: request.rawIdea,
      now: client.now,
    });
  const fallback = createBuildFallback(
    baseProject,
    request.selectedDirectionId,
    request.userMessage
  );

  const content = await tryComplete(
    client,
    createBuildPrompt(request, fallback.project.hotellingModel?.symbols ?? [])
  );
  const payload = content ? (extractFirstJsonObject(content) as BuildModelPayload | null) : null;
  const hotellingModel = parseHotellingModel(
    payload?.hotellingModel,
    fallback.project.hotellingModel?.symbols ?? []
  );
  const assistantMessage = parseText(payload?.assistantMessage);

  if (!hotellingModel || !assistantMessage) {
    logGenerationFallback("build_model", {
      hasContent: Boolean(content),
      payloadKeys: payload ? Object.keys(payload) : [],
      hotellingModelType: typeof payload?.hotellingModel,
      assistantMessageType: typeof payload?.assistantMessage,
      contentPreview: content?.slice(0, 500),
    });

    return fallback;
  }

  const selectedDirection =
    findDirection(baseProject, parseText(payload?.selectedDirectionId) ?? request.selectedDirectionId) ??
    findDirection(baseProject, request.selectedDirectionId) ??
    baseProject.researchSession?.directions.find((direction) => direction.recommended) ??
    baseProject.researchSession?.directions[0];
  const previousSession = baseProject.researchSession;
  const userMessage = request.userMessage?.trim();
  const messages: ResearchSessionMessage[] = [
    ...(previousSession?.messages ?? []),
    ...(userMessage
      ? [
          {
            id: `msg-user-model-${Date.now()}`,
            role: "user" as const,
            content: userMessage,
            createdAt: 0,
          },
        ]
      : []),
    {
      id: `msg-assistant-model-${Date.now()}`,
      role: "assistant",
      content: assistantMessage,
      createdAt: 0,
    },
  ];
  const assetSummary =
    parseAssetSummary(payload?.assetSummary, hotellingModel) ??
    createModelAssetSummary(selectedDirection, hotellingModel);

  return {
    project: {
      ...baseProject,
      projectType: "formal",
      refinedIdea: parseText(payload?.refinedIdea) ?? selectedDirection?.title ?? baseProject.refinedIdea,
      researchSession: {
        phase: "model",
        directions: previousSession?.directions ?? [],
        messages,
        assetSummary,
      },
      hotellingModel,
      equilibriumResult: createSymbolicEquilibriumScaffoldResult(),
    },
    usedFallback: false,
    assistantMessage,
  };
}

async function solveEquilibrium(
  request: ResearchGenerationRequest,
  client: ResearchCompletionClient
): Promise<ResearchGenerationResponse> {
  if (!request.project) {
    throw new Error("project is required for solve_equilibrium");
  }

  const fallbackProject = generateSymbolicEquilibrium(request.project);
  const content = await tryComplete(client, createEquilibriumPrompt(request.project));
  const payload = content ? (extractFirstJsonObject(content) as EquilibriumPayload | null) : null;
  const equilibriumResult = parseEquilibriumResult(payload?.equilibriumResult);
  const assistantMessage = parseText(payload?.assistantMessage);

  if (equilibriumResult && assistantMessage) {
    return {
      project: attachEquilibriumResult(request.project, equilibriumResult, assistantMessage),
      usedFallback: false,
      assistantMessage,
    };
  }

  if (content) {
    logGenerationFallback("solve_equilibrium", {
      hasContent: true,
      payloadKeys: payload ? Object.keys(payload) : [],
      equilibriumResultType: typeof payload?.equilibriumResult,
      assistantMessageType: typeof payload?.assistantMessage,
      contentPreview: content.slice(0, 500),
    });
  }

  return {
    project: fallbackProject,
    usedFallback: true,
    assistantMessage: fallbackProject.researchSession?.messages.at(-1)?.content ?? "",
  };
}

async function analyzeProperties(
  request: ResearchGenerationRequest,
  client: ResearchCompletionClient
): Promise<ResearchGenerationResponse> {
  if (!request.project) {
    throw new Error("project is required for analyze_properties");
  }

  const fallbackProject = generatePropertyAnalysis(request.project);
  const content = await tryComplete(client, createPropertyAnalysisPrompt(request.project));
  const payload = content ? (extractFirstJsonObject(content) as PropertyAnalysisPayload | null) : null;
  const analyses =
    parsePropertyAnalyses(payload?.propertyAnalyses) ??
    (parsePropertyAnalysis(payload?.propertyAnalysis)
      ? [parsePropertyAnalysis(payload?.propertyAnalysis) as PropertyAnalysis]
      : null);
  const assistantMessage = parseText(payload?.assistantMessage);

  if (analyses && assistantMessage) {
    return {
      project: attachPropertyAnalyses(request.project, analyses, assistantMessage),
      usedFallback: false,
      assistantMessage,
    };
  }

  if (content) {
    logGenerationFallback("analyze_properties", {
      hasContent: true,
      payloadKeys: payload ? Object.keys(payload) : [],
      propertyAnalysisType: typeof payload?.propertyAnalysis,
      propertyAnalysesType: Array.isArray(payload?.propertyAnalyses)
        ? "array"
        : typeof payload?.propertyAnalyses,
      assistantMessageType: typeof payload?.assistantMessage,
      contentPreview: content.slice(0, 500),
    });
  }

  return {
    project: fallbackProject,
    usedFallback: true,
    assistantMessage: fallbackProject.researchSession?.messages.at(-1)?.content ?? "",
  };
}

function createBuildFallback(
  project: ResearchProject,
  selectedDirectionId: string | undefined,
  userMessage: string | undefined
): ResearchGenerationResponse {
  const scaffoldProject =
    project.researchSession?.directions.length
      ? project
      : createExplorationProject({
          id: project.id,
          rawIdea: project.rawIdea,
          now: project.createdAt,
        });
  const directionId =
    selectedDirectionId ??
    scaffoldProject.researchSession?.directions.find((direction) => direction.recommended)?.id ??
    scaffoldProject.researchSession?.directions[0]?.id;

  if (!directionId) {
    return {
      project: scaffoldProject,
      usedFallback: true,
      assistantMessage: scaffoldProject.researchSession?.messages.at(-1)?.content ?? "",
    };
  }

  try {
    const adopted = appendUserMessageToProject(
      adoptResearchDirection(scaffoldProject, directionId),
      userMessage
    );
    return {
      project: adopted,
      usedFallback: true,
      assistantMessage: adopted.researchSession?.messages.at(-1)?.content ?? "",
    };
  } catch {
    const recommended = scaffoldProject.researchSession?.directions.find((direction) => direction.recommended);
    if (recommended && recommended.id !== directionId) {
      const adopted = appendUserMessageToProject(
        adoptResearchDirection(scaffoldProject, recommended.id),
        userMessage
      );
      return {
        project: adopted,
        usedFallback: true,
        assistantMessage: adopted.researchSession?.messages.at(-1)?.content ?? "",
      };
    }
    throw new Error("No deterministic model scaffold is available.");
  }
}

function appendUserMessageToProject(
  project: ResearchProject,
  userMessage: string | undefined
): ResearchProject {
  const trimmed = userMessage?.trim();
  if (!trimmed || !project.researchSession) return project;
  const messages = project.researchSession.messages;
  const insertIndex =
    messages.length > 0 && messages[messages.length - 1].role === "assistant"
      ? messages.length - 1
      : messages.length;
  const userEntry: ResearchSessionMessage = {
    id: `msg-user-model-fallback-${Date.now()}`,
    role: "user",
    content: trimmed,
    createdAt: 0,
  };

  return {
    ...project,
    researchSession: {
      ...project.researchSession,
      messages: [
        ...messages.slice(0, insertIndex),
        userEntry,
        ...messages.slice(insertIndex),
      ],
    },
  };
}

function appendConversationMessages(
  project: ResearchProject,
  userMessage: string,
  assistantMessage: string
): ResearchProject {
  const session =
    project.researchSession ??
    createExplorationProject({
      id: project.id,
      rawIdea: project.rawIdea,
      now: project.createdAt,
    }).researchSession;
  if (!session) return project;
  const createdAt = Date.now();

  return {
    ...project,
    researchSession: {
      ...session,
      directions: session.directions,
      messages: [
        ...session.messages,
        {
          id: `msg-user-conversation-${createdAt}`,
          role: "user",
          content: userMessage,
          createdAt: 0,
        },
        {
          id: `msg-assistant-conversation-${createdAt}`,
          role: "assistant",
          content: assistantMessage,
          createdAt: 0,
        },
      ],
      assetSummary: session.assetSummary ?? {
        confirmedAssumptions: [],
        utilityFunctions: [],
        equilibriumStatus: "not_started",
        nextActions: ["选择一个研究方向"],
      },
    },
  };
}

function attachEquilibriumResult(
  project: ResearchProject,
  equilibriumResult: EquilibriumResult,
  assistantMessage: string
): ResearchProject {
  const session =
    project.researchSession ?? createExplorationProject({
      id: project.id,
      rawIdea: project.rawIdea,
      now: project.createdAt,
    }).researchSession;
  const messages: ResearchSessionMessage[] = [
    ...(session?.messages ?? []),
    {
      id: `msg-start-equilibrium-provider-${Date.now()}`,
      role: "user",
      content: "开始符号均衡求解。",
      createdAt: 0,
    },
    {
      id: `msg-equilibrium-provider-${Date.now()}`,
      role: "assistant",
      content: assistantMessage,
      createdAt: 0,
    },
  ];

  return {
    ...project,
    equilibriumResult,
    researchSession: {
      ...session,
      phase: "analysis",
      directions: session?.directions ?? [],
      messages,
      assetSummary: {
        ...(session?.assetSummary ?? {
          confirmedAssumptions: [],
          utilityFunctions: [],
          equilibriumStatus: "not_started" as const,
          nextActions: [],
        }),
        equilibriumStatus: equilibriumResult.status,
        pendingDecision: {
          kind: "analyze_properties",
          prompt:
            "符号均衡结果已经生成。下一步可以对佣金、补贴、网络效应和差异化成本做符号性质分析。",
        },
        nextActions: [
          "检查符号均衡推导",
          "复制并运行 SymPy 求解代码",
          "生成性质分析",
        ],
      },
    },
  };
}

function attachPropertyAnalyses(
  project: ResearchProject,
  analyses: PropertyAnalysis[],
  assistantMessage: string
): ResearchProject {
  const session =
    project.researchSession ?? createExplorationProject({
      id: project.id,
      rawIdea: project.rawIdea,
      now: project.createdAt,
    }).researchSession;
  const messages: ResearchSessionMessage[] = [
    ...(session?.messages ?? []),
    {
      id: `msg-start-analysis-provider-${Date.now()}`,
      role: "user",
      content: "生成性质分析。",
      createdAt: 0,
    },
    {
      id: `msg-analysis-provider-${Date.now()}`,
      role: "assistant",
      content: assistantMessage,
      createdAt: 0,
    },
  ];

  return {
    ...project,
    propertyAnalyses: analyses,
    researchSession: {
      ...session,
      phase: "analysis",
      directions: session?.directions ?? [],
      messages,
      assetSummary: {
        ...(session?.assetSummary ?? {
          confirmedAssumptions: [],
          utilityFunctions: [],
          equilibriumStatus: project.equilibriumResult?.status ?? "not_started",
          nextActions: [],
        }),
        equilibriumStatus: project.equilibriumResult?.status ?? "not_started",
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

async function tryComplete(
  client: ResearchCompletionClient,
  messages: LlmMessage[]
): Promise<string | null> {
  if (!client.complete) return null;

  try {
    return await client.complete(messages);
  } catch (error) {
    logGenerationFallback("provider_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function logGenerationFallback(
  action: string,
  detail: Record<string, unknown>
) {
  console.warn("Research generation used fallback", {
    action,
    ...detail,
  });
}

function createEquilibriumPrompt(project: ResearchProject): LlmMessage[] {
  const symbolContext = createSymbolPromptContext(project);
  return [
    {
      role: "developer",
      content:
        "You output strict JSON only. Top-level keys must be assistantMessage and equilibriumResult. No markdown. equilibriumResult must include status,concept,solvingSteps,focs,conditions,closedForm,derivation,code,warnings. The result must be symbolic: use FOC equations, reaction functions, closed-form expressions or exact symbolic-failure explanation plus reusable SymPy code. Do not use numeric substitution, simulation, calibration, Monte Carlo, empirical regression, or parameter assignment as equilibrium. Reuse the supplied symbol registry exactly; if a symbol is missing, define it explicitly and keep notation consistent with the current model.",
    },
    {
      role: "user",
      content:
        "Solve the Hotelling/two-sided platform model symbolically. Return JSON only.\n" +
        JSON.stringify({
          rawIdea: project.rawIdea,
          hotellingModel: project.hotellingModel,
          existingEquilibrium: project.equilibriumResult,
          symbolRegistry: symbolContext.symbolRegistry,
          symbolGovernanceIssues: symbolContext.symbolIssues,
          requiredShape: {
            assistantMessage: "中文说明",
            equilibriumResult: {
              status: "solved 或 symbolic_failure",
              concept: "均衡概念",
              solvingSteps: ["符号求解步骤"],
              focs: ["\\frac{\\partial \\Pi_i}{\\partial \\tau_i}=0"],
              conditions: ["参数约束"],
              closedForm: "闭式解、反应函数或符号爆炸说明",
              derivation: "符号推导说明",
              code: "可运行 SymPy 代码",
              warnings: ["仅保留符号解，不用数值模拟"],
            },
          },
        }),
    },
  ];
}

function createPropertyAnalysisPrompt(project: ResearchProject): LlmMessage[] {
  const symbolContext = createSymbolPromptContext(project);
  return [
    {
      role: "developer",
      content:
        "You output strict JSON only. Top-level keys must be assistantMessage and propertyAnalyses. No markdown. propertyAnalyses must be an array of 3 to 5 objects. Each object must include id,target,parameter,operation,symbolicResult,signCondition,propositionDraft,proofSketch,intuition,warnings. The analyses must be useful symbolic comparative statics/proposition analysis, not simulation, numeric examples, or trivial zero derivatives caused only by a parameter being absent from the model. Reuse the supplied symbol registry exactly and state symbol meanings consistently.",
    },
    {
      role: "user",
      content:
        "Generate one symbolic property analysis from this equilibrium context. Return JSON only.\n" +
        JSON.stringify({
          rawIdea: project.rawIdea,
          hotellingModel: project.hotellingModel,
          equilibriumResult: project.equilibriumResult,
          symbolRegistry: symbolContext.symbolRegistry,
          symbolGovernanceIssues: symbolContext.symbolIssues,
          requiredShape: {
            assistantMessage: "中文说明",
            propertyAnalyses: [
              {
                id: "analysis-id",
                target: "\\tau_i^*",
                parameter: "\\alpha_B",
                operation: "differentiate",
                symbolicResult:
                  "\\frac{\\partial \\tau_i^*}{\\partial \\alpha_B}",
                signCondition: "符号条件",
                propositionDraft: "命题草稿",
                proofSketch: "证明草稿",
                intuition: "经济直觉",
                warnings: ["不使用数值模拟"],
              },
            ],
          },
        }),
    },
  ];
}

function createConversationPrompt(
  project: ResearchProject,
  userMessage: string
): LlmMessage[] {
  const session = project.researchSession;
  const symbolContext = createSymbolPromptContext(project);
  const recentMessages = session?.messages.slice(-10).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return [
    {
      role: "developer",
      content:
        "You are PaperForge, a Chinese research assistant for theoretical game theory papers. Return strict JSON only. Top-level keys must be assistantMessage and optionally assetPatch. assistantMessage must be the exact natural-language reply the user should see in chat, in Chinese, without markdown fences or code fences. Use assetPatch only when the user explicitly asks for a structured edit to the current model, equilibrium result, or property analyses. If you include assetPatch, make it concrete, symbolic, and limited to the requested edit. Do not silently overwrite the project in the reply text. Reuse the supplied symbol registry and, when the user asks about notation, answer with the current symbol names or produce a symbol patch instead of a generic workflow reply. For symbol edits, use assetPatch.kind='update_model' and target paths such as hotellingModel.symbols[tau_A].symbol, hotellingModel.symbols[tau_A].meaning, or hotellingModel.symbols with op='insert' and a complete symbol object.",
    },
    {
      role: "user",
      content:
        "Continue this research conversation in Chinese.\n" +
        JSON.stringify({
          latestUserMessage: userMessage,
          rawIdea: project.rawIdea,
          phase: session?.phase,
          currentDirection: session?.assetSummary.currentDirection,
          pendingDecision: session?.assetSummary.pendingDecision,
          hotellingModel: project.hotellingModel,
          equilibriumResult: project.equilibriumResult,
          propertyAnalyses: project.propertyAnalyses,
          symbolRegistry: symbolContext.symbolRegistry,
          symbolGovernanceIssues: symbolContext.symbolIssues,
          recentMessages,
        }),
    },
  ];
}

function createConversationFallbackMessage(
  project: ResearchProject,
  userMessage: string
) {
  const symbolHighlights = resolvePromptSymbols(project)
    .filter((symbol) => symbol.recommended)
    .slice(0, 4)
    .map((symbol) => symbol.symbol)
    .join("、");

  if (/^(你好|hello|hi|嗨|在吗)[！!。.\s]*$/i.test(userMessage)) {
    return `你好，我在。当前符号表里已经有 ${symbolHighlights || "一些核心记号"}。你可以直接问我某个符号是什么意思，或者说要把哪一个记号改成你想用的写法。`;
  }

  if (/(符号|记号|notation|变量|字母|tau|alpha|beta|kappa|kappa|f\b)/i.test(userMessage)) {
    return `我已经看见你在问记号了。当前可用的核心符号包括 ${symbolHighlights || "当前模型符号"}。你可以直接说要改哪个符号、补哪个定义，或者让我把右侧符号表展开出来。`;
  }

  const phase = project.researchSession?.phase;
  if (phase === "direction") {
    return `我已经记录这个想法。当前还在方向发现阶段，你可以直接问我这条方向为什么成立、怎么收窄，或者让我先把符号表补齐到可建模状态。`;
  }

  if (phase === "model") {
    return `我已经保留当前模型草稿。你可以直接问我某个假设为什么这样写，或者明确说要改哪一个符号。`;
  }

  if (phase === "equilibrium") {
    return `我已经保留当前均衡草稿。你可以直接问我推导哪一步，或者明确要求我重做均衡并沿用现有符号。`;
  }

  return `我已经保留当前性质分析草稿。你可以直接问我哪条命题为什么这样写，或者明确要求我重做性质分析并统一符号。`;
}

function createConversationFallbackAssetPatch(
  project: ResearchProject,
  userMessage: string
): ResearchAssetPatch | null {
  if (!project.hotellingModel) return null;

  const renameMatch = userMessage.match(
    /把\s*([\\A-Za-z][\\A-Za-z0-9_{}^]*)\s*(?:这个)?(?:符号|记号|变量)?\s*(?:改成|改为|换成)\s*([\\A-Za-z][\\A-Za-z0-9_{}^]*)/i
  );
  if (renameMatch) {
    const currentSymbol = findSymbolByNotation(
      project.hotellingModel.symbols,
      renameMatch[1]
    );
    const nextNotation = renameMatch[2];
    if (!currentSymbol) return null;

    return {
      kind: "update_model",
      summary: `把符号 ${currentSymbol.symbol} 改为 ${nextNotation}`,
      changes: [
        {
          target: `hotellingModel.symbols[${currentSymbol.codeName}].symbol`,
          op: "set",
          value: nextNotation,
          reason: "用户要求统一符号写法。",
        },
      ],
    };
  }

  const definitionMatch = userMessage.match(
    /(?:把\s*)?([\\A-Za-z][\\A-Za-z0-9_{}^]*)\s*(?:定义为|设为|表示|含义是)\s*([^。；;\n]{2,80})/i
  );
  if (definitionMatch) {
    const notation = definitionMatch[1];
    const meaning = definitionMatch[2].trim();
    const currentSymbol = findSymbolByNotation(project.hotellingModel.symbols, notation);

    if (currentSymbol) {
      return {
        kind: "update_model",
        summary: `补充符号 ${currentSymbol.symbol} 的含义`,
        changes: [
          {
            target: `hotellingModel.symbols[${currentSymbol.codeName}].meaning`,
            op: "set",
            value: meaning,
            reason: "用户要求补充符号定义。",
          },
        ],
      };
    }

    return {
      kind: "update_model",
      summary: `新增符号 ${notation} 的定义`,
      changes: [
        {
          target: "hotellingModel.symbols",
          op: "insert",
          value: createSymbolPatchValue(notation, meaning),
          reason: "用户要求新增符号定义。",
        },
      ],
    };
  }

  return null;
}

function findSymbolByNotation(
  symbols: SymbolDefinition[],
  notation: string
): SymbolDefinition | undefined {
  const needle = notation.trim();
  return symbols.find(
    (symbol) =>
      symbol.symbol === needle ||
      symbol.codeName === needle ||
      symbol.baseSymbol === needle ||
      `${symbol.baseSymbol}_${symbol.subscript ?? ""}` === needle
  );
}

function createSymbolPatchValue(notation: string, meaning: string): JsonValue {
  const parsed = parseSimpleNotation(notation);
  return {
    symbol: formatSimpleNotation(parsed),
    baseSymbol: parsed.baseSymbol,
    subscript: parsed.subscript,
    superscript: parsed.superscript,
    codeName: [parsed.baseSymbol, parsed.subscript, parsed.superscript]
      .filter(Boolean)
      .join("_")
      .replace(/\\/g, "")
      .replace(/[^A-Za-z0-9_]/g, "_"),
    name: formatSimpleNotation(parsed),
    meaning,
    role: "parameter",
    side: "global",
    assumption: "real",
    recommended: false,
  };
}

function parseSimpleNotation(notation: string) {
  const cleaned = notation.trim();
  const match = cleaned.match(/^(.+?)(?:_\{?([^}^{]+)\}?)?(?:\^\{?([^}^{]+)\}?)?$/);
  return {
    baseSymbol: match?.[1]?.trim() || cleaned || "x",
    subscript: match?.[2]?.trim() ?? "",
    superscript: match?.[3]?.trim() ?? "",
  };
}

function formatSimpleNotation({
  baseSymbol,
  subscript,
  superscript,
}: {
  baseSymbol: string;
  subscript?: string;
  superscript?: string;
}) {
  return `${baseSymbol}${subscript ? `_${subscript}` : ""}${
    superscript ? `^${superscript}` : ""
  }`;
}

type SymbolPromptContext = {
  symbolRegistry: string;
  symbolIssues: string[];
  symbolCount: number;
};

function createSymbolPromptContext(
  project?: ResearchProject,
  fallbackSymbols: SymbolDefinition[] = []
): SymbolPromptContext {
  const symbols = resolvePromptSymbols(project, fallbackSymbols);
  const issues = validateSymbolGovernance({ symbols });

  return {
    symbolRegistry: formatSymbolRegistryForPrompt(symbols),
    symbolIssues: issues.map((issue) => issue.message),
    symbolCount: symbols.length,
  };
}

function resolvePromptSymbols(
  project?: ResearchProject,
  fallbackSymbols: SymbolDefinition[] = []
): SymbolDefinition[] {
  const projectSymbols = normalizeSymbolRegistry(project?.hotellingModel?.symbols);
  if (projectSymbols.length > 0) return projectSymbols;

  if (fallbackSymbols.length > 0) {
    const normalizedFallback = normalizeSymbolRegistry(fallbackSymbols);
    if (normalizedFallback.length > 0) return normalizedFallback;
  }

  const direction = project?.researchSession?.assetSummary.currentDirection;
  if (direction) {
    const directionSymbols = createResearchSymbolRegistryForDirection(direction);
    if (directionSymbols.length > 0) return directionSymbols;
  }

  return createHotellingSymbolSeed();
}

export function createDiscoverPrompt(rawIdea: string): LlmMessage[] {
  return [
    {
      role: "developer",
      content:
        "You output strict JSON only. Top-level keys must be assistantMessage and directions. directions must be an array of exactly 4 objects. Each direction must include id,title,summary,model,contribution,recommended. No markdown. No extra keys. No papers. The product serves theoretical game-theory modeling papers only. Every direction must support symbolic equilibrium solving with utility functions, demand shares, profit functions, and analytical comparative statics. Do not generate empirical, case-study, survey, machine-learning, calibration, or simulation-only directions. At least one direction must explicitly use Hotelling or two-sided platform competition.",
    },
    {
      role: "user",
      content:
        `Research idea: ${rawIdea}\n` +
        "Generate 4 Chinese theoretical modeling directions for Hotelling/two-sided platform symbolic equilibrium papers. Return JSON only in this exact shape: " +
        "{\"assistantMessage\":\"中文一句话\",\"directions\":[{\"id\":\"d1\",\"title\":\"中文标题\",\"summary\":\"中文摘要\",\"model\":\"模型名称\",\"contribution\":\"中文贡献\",\"recommended\":true}]}",
    },
  ];
}

function createBuildPrompt(
  request: ResearchGenerationRequest,
  fallbackSymbols: SymbolDefinition[] = []
): LlmMessage[] {
  const symbolContext = createSymbolPromptContext(request.project, fallbackSymbols);
  return [
    {
      role: "developer",
      content:
        "You output strict JSON only. Top-level keys must be assistantMessage and hotellingModel. No markdown. No extra keys. hotellingModel must include symbols,sides,platforms,timing,utilityFunctions,demandDerivation,profitFunctions,assumptions,modelSetupDraft. The model must be suitable for symbolic equilibrium solving. Do not use numeric substitution, simulation, calibration, or empirical regression. Use LaTeX strings for utility functions, profit functions, and derivations. Reuse the supplied symbol registry exactly and keep every symbol defined; if you need a new symbol, add it explicitly in hotellingModel.symbols with name, meaning, role, side, and assumption. If the topic is secondhand platform commissions and subsidies, platforms may charge or subsidize both buyers and sellers; do not assume one side is always charged while the other is always subsidized.",
    },
    {
      role: "user",
      content:
        "Build a Chinese Hotelling/two-sided platform model from this context. Return JSON only.\n" +
        JSON.stringify({
          rawIdea: request.rawIdea,
          selectedDirectionId: request.selectedDirectionId,
          userMessage: request.userMessage,
          directions: request.project?.researchSession?.directions,
          symbolRegistry: symbolContext.symbolRegistry,
          symbolGovernanceIssues: symbolContext.symbolIssues,
          requiredShape: {
            assistantMessage: "中文说明",
            hotellingModel: {
              symbols: [],
              sides: {
                consumerSideName: "买家",
                merchantSideName: "卖家",
              },
              platforms: ["A", "B"],
              timing: [
                {
                  id: "stage-pricing",
                  order: 1,
                  name: "平台选择收费或补贴策略",
                  decisions: ["f_i^B", "f_i^S"],
                },
              ],
              utilityFunctions: [
                {
                  id: "u-buyer-a",
                  side: "consumer",
                  platform: "A",
                  expression: "U_A^B = ...",
                  notes: "中文解释",
                },
              ],
              demandDerivation: "中文说明",
              profitFunctions: [
                {
                  id: "profit-a",
                  platform: "A",
                  expression: "\\Pi_A = ...",
                  notes: "中文解释",
                },
              ],
              assumptions: ["中文假设"],
              modelSetupDraft: "中文模型设定草稿",
            },
          },
        }),
    },
  ];
}

export function parseDirections(value: unknown): ResearchDirection[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length > 4) return null;

  const directions = value.map((entry) => {
    if (!isRecord(entry)) return null;
    const id = parseText(entry.id);
    const title = parseText(entry.title);
    const summary = parseText(entry.summary);
    const model =
      parseText(entry.model) ??
      parseText(entry["模型"]) ??
      inferDirectionModel(title, summary);
    const contribution =
      parseText(entry.contribution) ??
      parseText(entry["贡献"]) ??
      parseText(entry["researchContribution"]);

    if (!id || !title || !summary || !model || !contribution) return null;

    return {
      id,
      title,
      summary,
      model,
      contribution,
      recommended: entry.recommended === true,
    };
  });

  if (directions.some((direction) => !direction)) return null;

  const parsed = directions as ResearchDirection[];
  if (!parsed.some((direction) => direction.recommended)) {
    parsed[0] = { ...parsed[0], recommended: true };
  }

  return parsed;
}

function inferDirectionModel(title: string | null, summary: string | null) {
  const text = `${title ?? ""} ${summary ?? ""}`;

  if (/hotelling|霍特林/i.test(text)) return "Hotelling 平台竞争模型";
  if (/双边|two-sided/i.test(text)) return "双边平台竞争模型";
  if (/信号|signal/i.test(text)) return "信号博弈模型";
  return null;
}

function parseHotellingModel(
  value: unknown,
  fallbackSymbols: SymbolDefinition[] = []
): HotellingModel | null {
  if (!isRecord(value)) return null;
  const sides = isRecord(value.sides) ? value.sides : null;
  const consumerSideName = parseText(sides?.consumerSideName);
  const merchantSideName = parseText(sides?.merchantSideName);
  const platforms = parseStringArray(value.platforms);
  const timing = Array.isArray(value.timing) ? value.timing : null;
  const utilityFunctions = Array.isArray(value.utilityFunctions) ? value.utilityFunctions : null;
  const profitFunctions = Array.isArray(value.profitFunctions) ? value.profitFunctions : null;
  const demandDerivation = parseText(value.demandDerivation);
  const assumptions = parseStringArray(value.assumptions);
  const modelSetupDraft = parseText(value.modelSetupDraft);

  if (
    !consumerSideName ||
    !merchantSideName ||
    !platforms ||
    !timing ||
    !utilityFunctions ||
    !profitFunctions ||
    !demandDerivation ||
    !assumptions ||
    !modelSetupDraft
  ) {
    return null;
  }

  return {
    symbols:
      normalizeSymbolRegistry(value.symbols).length > 0
        ? normalizeSymbolRegistry(value.symbols)
        : normalizeSymbolRegistry(fallbackSymbols),
    sides: { consumerSideName, merchantSideName },
    platforms,
    timing: timing as HotellingModel["timing"],
    utilityFunctions: utilityFunctions as HotellingModel["utilityFunctions"],
    demandDerivation,
    profitFunctions: profitFunctions as HotellingModel["profitFunctions"],
    assumptions,
    modelSetupDraft,
  };
}

function parseEquilibriumResult(value: unknown): EquilibriumResult | null {
  if (!isRecord(value)) return null;

  const status = parseEquilibriumStatus(value.status);
  const concept = parseText(value.concept);
  const solvingSteps = parseStringArray(value.solvingSteps);
  const focs = parseStringArray(value.focs);
  const conditions = parseStringArray(value.conditions);
  const closedForm = parseText(value.closedForm);
  const derivation = parseText(value.derivation);
  const code = parseText(value.code);
  const warnings = parseStringArray(value.warnings) ?? [];

  if (
    !status ||
    !concept ||
    !solvingSteps ||
    !focs ||
    !conditions ||
    !closedForm ||
    !derivation ||
    !code
  ) {
    return null;
  }

  const result: EquilibriumResult = {
    status,
    concept,
    solvingSteps,
    focs,
    conditions,
    closedForm,
    derivation,
    code,
    warnings,
  };

  return isSymbolicEquilibriumResult(result) ? result : null;
}

function parsePropertyAnalyses(value: unknown): PropertyAnalysis[] | null {
  if (!Array.isArray(value)) return null;
  const analyses = value.map(parsePropertyAnalysis);
  if (analyses.some((analysis) => !analysis)) return null;
  return analyses as PropertyAnalysis[];
}

function parsePropertyAnalysis(value: unknown): PropertyAnalysis | null {
  if (!isRecord(value)) return null;

  const id = parseText(value.id);
  const target = parseText(value.target);
  const parameter = parseText(value.parameter);
  const operation = parsePropertyOperation(value.operation);
  const symbolicResult = parseText(value.symbolicResult);
  const signCondition = parseText(value.signCondition);
  const propositionDraft = parseText(value.propositionDraft);
  const proofSketch = parseText(value.proofSketch);
  const intuition = parseText(value.intuition);
  const warnings = parseStringArray(value.warnings) ?? [];

  if (
    !id ||
    !target ||
    !parameter ||
    !operation ||
    !symbolicResult ||
    !signCondition ||
    !propositionDraft ||
    !proofSketch ||
    !intuition
  ) {
    return null;
  }

  const analysis: PropertyAnalysis = {
    id,
    target,
    parameter,
    operation,
    symbolicResult,
    signCondition,
    propositionDraft,
    proofSketch,
    intuition,
    warnings,
  };

  return isSymbolicPropertyAnalysis(analysis) ? analysis : null;
}

function parseEquilibriumStatus(
  value: unknown
): EquilibriumResult["status"] | null {
  if (
    value === "idle" ||
    value === "solved" ||
    value === "needs_revision" ||
    value === "symbolic_failure"
  ) {
    return value;
  }
  return null;
}

function parsePropertyOperation(
  value: unknown
): PropertyAnalysis["operation"] | null {
  if (typeof value === "string" && /∂|\\partial|differentiat/i.test(value)) {
    return "differentiate";
  }

  if (
    value === "differentiate" ||
    value === "compare" ||
    value === "threshold" ||
    value === "custom"
  ) {
    return value;
  }
  return null;
}

function isSymbolicEquilibriumResult(result: EquilibriumResult) {
  if (result.status === "idle" || result.status === "needs_revision") {
    return false;
  }

  const combined = [
    result.concept,
    ...result.solvingSteps,
    ...result.focs,
    ...result.conditions,
    result.closedForm,
    result.derivation,
    result.code,
    ...result.warnings,
  ].join("\n");

  if (containsSimulationOnlyText(combined)) return false;
  if (containsMalformedClosedForm(result.closedForm)) return false;

  const symbolicSignals = [
    /\\frac/,
    /\\partial/,
    /∂/,
    /Π/,
    /τ/,
    /α|β/,
    /FOC|foc/i,
    /sp\.solve/,
    /sympy/i,
    /反应函数|无差异|闭式|解析|符号/,
    /R_\{/,
  ];

  return symbolicSignals.some((pattern) => pattern.test(combined));
}

function isSymbolicPropertyAnalysis(analysis: PropertyAnalysis) {
  const combined = [
    analysis.target,
    analysis.parameter,
    analysis.symbolicResult,
    analysis.signCondition,
    analysis.propositionDraft,
    analysis.proofSketch,
    analysis.intuition,
    ...analysis.warnings,
  ].join("\n");

  if (containsSimulationOnlyText(combined)) return false;
  if (isTrivialMissingParameterProperty(analysis)) return false;

  return /\\frac|\\partial|∂|α|β|隐函数|符号|FOC|反应函数|阈值|Leftrightarrow/i.test(
    combined
  );
}

function containsMalformedClosedForm(text: string) {
  return (
    /\*\*/.test(text) ||
    /\b[A-Za-z]\w*\s*\*\s*=/.test(text) ||
    /\d(?:\s*)[A-Za-z_]\w*\s*\*/.test(text) ||
    /[A-Za-z_]\w*\s*\*\s*=\s*[^,;，；\n]+[A-Za-z_]\w*\s*\*/.test(text)
  );
}

function isTrivialMissingParameterProperty(analysis: PropertyAnalysis) {
  const resultText = analysis.symbolicResult.replace(/\s+/g, "");
  const explanation = [
    analysis.signCondition,
    analysis.propositionDraft,
    analysis.proofSketch,
    analysis.intuition,
    ...analysis.warnings,
  ].join("\n");

  const claimsZero =
    /=0(?:$|[^-9])/.test(resultText) ||
    /零|zero/i.test(analysis.signCondition);
  const missingParameterReason =
    /不含|未纳入|未进入|未包含|没有纳入|缺少|absent|not included|does not include|doesn't include/i.test(
      explanation
    );

  return claimsZero && missingParameterReason;
}

function containsSimulationOnlyText(text: string) {
  return /Monte Carlo|simulate|simulation|仿真结果|数值模拟结果|数值仿真|令\s+\w+\s*=\s*\d/i.test(
    text
  );
}

function parseAssetSummary(
  value: unknown,
  model: HotellingModel
): ResearchSessionAssetSummary | null {
  if (!isRecord(value)) return null;

  return {
    confirmedAssumptions: parseStringArray(value.confirmedAssumptions) ?? model.assumptions,
    utilityFunctions:
      parseStringArray(value.utilityFunctions) ??
      model.utilityFunctions.map((entry) => `$${entry.expression}$`),
    equilibriumStatus: "等待模型确认",
    nextActions: parseStringArray(value.nextActions) ?? [
      "确认模型设定",
      "检查效用函数",
      "准备符号化一阶条件",
    ],
    pendingDecision: {
      kind: "answer_model_question",
      prompt:
        parseText(isRecord(value.pendingDecision) ? value.pendingDecision.prompt : undefined) ??
        "请确认当前模型设定，之后进入符号化均衡求解。",
    },
  };
}

function createModelAssetSummary(
  direction: ResearchDirection | undefined,
  model: HotellingModel
): ResearchSessionAssetSummary {
  return {
    currentDirection: direction,
    confirmedAssumptions: model.assumptions,
    utilityFunctions: model.utilityFunctions.map((entry) => `$${entry.expression}$`),
    equilibriumStatus: "等待模型确认",
    nextActions: ["确认模型设定", "检查效用函数", "准备符号化一阶条件"],
    pendingDecision: {
      kind: "answer_model_question",
      prompt: "请确认当前模型设定，之后进入符号化均衡求解。",
    },
  };
}

function findDirection(project: ResearchProject, directionId: string | undefined) {
  if (!directionId) return undefined;
  return project.researchSession?.directions.find((direction) => direction.id === directionId);
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings = value.map(parseText);
  if (strings.some((entry) => !entry)) return null;
  return strings as string[];
}

function parseText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
