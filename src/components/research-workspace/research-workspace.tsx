"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, PanelRightOpen } from "lucide-react";
import { toast } from "sonner";

import { ChatPanel } from "./chat-panel";
import { ResearchAssetsPanel } from "./research-assets-panel";
import { ResearchSidebar } from "./research-sidebar";
import { ResearchWorkspaceShell } from "./research-workspace-shell";
import {
  createExplorationProjectApi,
  createProject,
  generateResearchProjectApi,
  saveProject,
  type GenerateResearchProjectResult,
} from "@/lib/api";
import {
  MODEL_SOURCE_STORAGE_KEY,
  getModelSourceMetadata,
  getRuntimeModelSourceSettings,
  parseStoredModelSourceSettings,
} from "@/lib/model-source";
import { markResearchAssetsStaleAfterModelEdit } from "@/lib/research-flow";
import { classifyResearchInput } from "@/lib/research-intent";
import {
  adoptResearchDirection,
  confirmResearchModel,
  createExplorationProject,
  createInitialResearchSession,
  generatePropertyAnalysis,
  generateSymbolicEquilibrium,
  normalizeResearchProjectForWorkspace,
} from "@/lib/research-session";
import { normalizeSymbolRegistry } from "@/lib/symbol-governance";
import { applyModelPatchToHotellingModel } from "@/lib/research-model-patch";
import { useStore } from "@/lib/store";
import type {
  ModelSourceSettings,
  ResearchAssetPatch,
  ResearchProject,
  ResearchSessionMessage,
  SymbolDefinition,
} from "@/lib/types";

export function ResearchWorkspace({ project }: { project?: ResearchProject }) {
  const router = useRouter();
  const { dispatch } = useStore();
  const [isSending, setIsSending] = useState(false);
  const [adoptingDirectionId, setAdoptingDirectionId] = useState<string | null>(
    null
  );
  const [isConfirmingModel, setIsConfirmingModel] = useState(false);
  const [isSolvingEquilibrium, setIsSolvingEquilibrium] = useState(false);
  const [isAnalyzingProperties, setIsAnalyzingProperties] = useState(false);
  const [isComposingNewConversation, setIsComposingNewConversation] =
    useState(!project);
  const [optimisticMessage, setOptimisticMessage] =
    useState<ResearchSessionMessage | null>(null);
  const activeProject = project
    ? normalizeResearchProjectForWorkspace(project)
    : null;
  const session = activeProject
    ? activeProject.researchSession ??
      createInitialResearchSession(activeProject.rawIdea)
    : null;
  const isBusy =
    isSending ||
    Boolean(adoptingDirectionId) ||
    isConfirmingModel ||
    isSolvingEquilibrium ||
    isAnalyzingProperties;

  function readStoredModelSourceSettings() {
    return parseStoredModelSourceSettings(
      window.localStorage.getItem(MODEL_SOURCE_STORAGE_KEY)
    );
  }

  function readRuntimeModelSourceSettings() {
    return getRuntimeModelSourceSettings(readStoredModelSourceSettings());
  }

  async function persistGeneratedProject(nextProject: ResearchProject) {
    dispatch({ type: "SET_PROJECT", payload: nextProject });
    await saveProject(nextProject);
  }

  async function handleAdopt(directionId: string) {
    if (!activeProject || isBusy) return;

    setAdoptingDirectionId(directionId);
    try {
      const { project: nextProject, usedFallback } =
        await generateResearchProjectApi({
          action: "build_model",
          rawIdea: activeProject.rawIdea,
          selectedDirectionId: directionId,
          project: activeProject,
          runtimeModelSource: readRuntimeModelSourceSettings(),
        });
      await persistGeneratedProject(nextProject);
      toast.success("已采用方向", {
        description: usedFallback
          ? "模型服务不可用时已使用本地模型草稿。"
          : "模型草稿已放到右侧模型页，可以继续检查和编辑。",
      });
    } catch (error) {
      console.error("Failed to adopt direction", error);
      try {
        const fallbackProject = adoptResearchDirection(activeProject, directionId);
        await persistGeneratedProject(fallbackProject);
        toast.info("已使用本地 Hotelling 模型草稿。");
      } catch (fallbackError) {
        console.error("Failed to adopt direction with client fallback", fallbackError);
        toast.error("采用方向失败");
      }
    } finally {
      setAdoptingDirectionId(null);
    }
  }

  async function handleConfirmModel() {
    if (!activeProject || isBusy) return;

    setIsConfirmingModel(true);
    try {
      const nextProject = confirmResearchModel(activeProject);
      await persistGeneratedProject(nextProject);
      toast.success("模型设定已确认", {
        description: "下一步可以在右侧均衡页生成符号均衡推导。",
      });
    } catch (error) {
      console.error("Failed to confirm model", error);
      toast.error("模型确认失败");
    } finally {
      setIsConfirmingModel(false);
    }
  }

  async function handleSolveEquilibrium(
    userMessage?: string,
    allowDuringChat = false
  ) {
    if (
      !activeProject ||
      (!allowDuringChat &&
        (isSending ||
          Boolean(adoptingDirectionId) ||
          isConfirmingModel ||
          isSolvingEquilibrium ||
          isAnalyzingProperties))
    ) {
      return;
    }

    setIsSolvingEquilibrium(true);
    try {
      const { project: nextProject, usedFallback } =
        await generateResearchProjectApi({
          action: "solve_equilibrium",
          rawIdea: activeProject.rawIdea,
          project: activeProject,
          runtimeModelSource: readRuntimeModelSourceSettings(),
        });
      const nextProjectWithMessage = userMessage
        ? attachChatMessageToProject(
            markAssetFreshnessAfterEquilibrium(nextProject),
            userMessage
          )
        : markAssetFreshnessAfterEquilibrium(nextProject);
      await persistGeneratedProject(nextProjectWithMessage);
      toast.success(usedFallback ? "已生成本地符号推导草稿" : "符号均衡推导已生成", {
        description: "请检查闭式解、推导步骤和存在条件是否可用于论文。",
      });
    } catch (error) {
      console.error("Failed to solve symbolic equilibrium", error);
      try {
        const fallbackProject = generateSymbolicEquilibrium(activeProject);
        const nextProjectWithMessage = userMessage
          ? attachChatMessageToProject(
              markAssetFreshnessAfterEquilibrium(fallbackProject),
              userMessage
            )
          : markAssetFreshnessAfterEquilibrium(fallbackProject);
        await persistGeneratedProject(nextProjectWithMessage);
        toast.info("已使用本地符号均衡推导草稿。");
      } catch (fallbackError) {
        console.error(
          "Failed to solve symbolic equilibrium with client fallback",
          fallbackError
        );
        toast.error("符号均衡推导生成失败");
      }
    } finally {
      setIsSolvingEquilibrium(false);
    }
  }

  async function handleAnalyzeProperties(
    userMessage?: string,
    allowDuringChat = false
  ) {
    if (
      !activeProject ||
      (!allowDuringChat &&
        (isSending ||
          Boolean(adoptingDirectionId) ||
          isConfirmingModel ||
          isSolvingEquilibrium ||
          isAnalyzingProperties))
    ) {
      return;
    }

    setIsAnalyzingProperties(true);
    try {
      const { project: nextProject, usedFallback } =
        await generateResearchProjectApi({
          action: "analyze_properties",
          rawIdea: activeProject.rawIdea,
          project: activeProject,
          runtimeModelSource: readRuntimeModelSourceSettings(),
        });
      const nextProjectWithMessage = userMessage
        ? attachChatMessageToProject(
            markAssetFreshnessAfterProperties(nextProject),
            userMessage
          )
        : markAssetFreshnessAfterProperties(nextProject);
      await persistGeneratedProject(nextProjectWithMessage);
      toast.success(usedFallback ? "已生成本地性质分析草稿" : "性质分析已生成", {
        description: "低质量或单条空洞性质会被拒绝，右侧质检会继续提示风险。",
      });
    } catch (error) {
      console.error("Failed to analyze properties", error);
      try {
        const fallbackProject = generatePropertyAnalysis(activeProject);
        const nextProjectWithMessage = userMessage
          ? attachChatMessageToProject(
              markAssetFreshnessAfterProperties(fallbackProject),
              userMessage
            )
          : markAssetFreshnessAfterProperties(fallbackProject);
        await persistGeneratedProject(nextProjectWithMessage);
        toast.info("已使用本地符号性质分析草稿。");
      } catch (fallbackError) {
        console.error(
          "Failed to analyze properties with client fallback",
          fallbackError
        );
        toast.error("性质分析生成失败");
      }
    } finally {
      setIsAnalyzingProperties(false);
    }
  }

  async function createFallbackProject(idea: string, settings: ModelSourceSettings) {
    const fallbackProject = createExplorationProject({
      rawIdea: idea,
      modelSource: settings,
    });
    const saved = await createExplorationProjectApi(fallbackProject);
    dispatch({ type: "NEW_PROJECT", payload: saved });
    setIsComposingNewConversation(false);
    router.push(`/research/${saved.id}`);
    toast.info("模型服务不可用，已使用本地 Hotelling 模板。");
  }

  async function handleSubmit(content: string) {
    if (isBusy) return;

    const idea = content.trim();
    if (!idea) return;

    setOptimisticMessage({
      id: createMessageId("msg-optimistic"),
      role: "user",
      content: idea,
      createdAt: createTimestamp(),
    });

    if (isComposingNewConversation || !activeProject) {
      setIsSending(true);
      const settings = readStoredModelSourceSettings();

      try {
        const { project: generatedProject, usedFallback } =
          await generateResearchProjectApi({
            action: "discover_directions",
            rawIdea: idea,
            modelSource: getModelSourceMetadata(settings),
            runtimeModelSource: getRuntimeModelSourceSettings(settings),
          });
        const saved = await createProject(generatedProject);
        dispatch({ type: "NEW_PROJECT", payload: saved });
        setIsComposingNewConversation(false);
        router.push(`/research/${saved.id}`);
        toast.success(usedFallback ? "已用本地模板开启探索" : "已开启新的探索对话");
      } catch (error) {
        console.error("Failed to generate research project", error);
        await createFallbackProject(idea, settings);
      } finally {
        setIsSending(false);
        setOptimisticMessage(null);
      }
      return;
    }

    if (!session) {
      setOptimisticMessage(null);
      return;
    }

    const inputIntent = classifyResearchInput(idea);

    setIsSending(true);
    try {
      if (inputIntent === "redo_equilibrium") {
        await handleSolveEquilibrium(idea, true);
        return;
      }

      if (inputIntent === "redo_properties" && activeProject.equilibriumResult) {
        await handleAnalyzeProperties(idea, true);
        return;
      }

      const result = await generateResearchProjectApi({
        action: "continue_conversation",
        rawIdea: activeProject.rawIdea,
        userMessage: idea,
        project: activeProject,
        runtimeModelSource: readRuntimeModelSourceSettings(),
      });
      const nextProject = attachConversationPatch(result);
      await persistGeneratedProject(nextProject);

      if (result.assetPatch) {
        toast.success("已生成修改建议", {
          description: "右侧会显示待应用修改，确认后才会改动结构化资产。",
        });
      } else if (result.usedFallback) {
        toast.info("模型服务暂不可用，已用本地研究助手回复。");
      } else {
        toast.success("已回复", {
          description: inputIntent === "refine_model"
            ? "这次先作为对话建议，不会直接覆盖模型。"
            : "这次消息只进入对话，不会覆盖当前研究资产。",
        });
      }
    } catch (error) {
      console.error("Failed to continue research generation", error);
      toast.error("对话回复失败");
    } finally {
      setIsSending(false);
      setOptimisticMessage(null);
    }
  }

  async function handleSaveModelAssumptions(assumptions: string[]) {
    if (!activeProject?.hotellingModel || !session) return;

    const nextProject = markResearchAssetsStaleAfterModelEdit({
      ...activeProject,
      hotellingModel: {
        ...activeProject.hotellingModel,
        assumptions,
      },
      researchSession: {
        ...session,
        assetSummary: {
          ...session.assetSummary,
          confirmedAssumptions: assumptions,
          pendingDecision: {
            kind: "solve_equilibrium",
            prompt: "模型假设已经修改。请重新生成符号均衡，再进入性质分析。",
          },
          nextActions: [
            "检查右侧模型假设是否准确",
            "重新生成符号均衡",
            "基于新均衡重做性质分析",
          ],
        },
        messages: [
          ...session.messages,
          {
            id: createMessageId("msg-model-edited"),
            role: "assistant",
            content:
              "模型假设已在右侧更新。旧的均衡和性质分析已标记为需要重新检查，建议下一步重新生成符号均衡。",
            createdAt: createTimestamp(),
          },
        ],
      },
    });

    await persistGeneratedProject(nextProject);
    toast.success("模型假设已保存", {
      description: "均衡和性质分析已标记为需要重算。",
    });
  }

  async function handleSaveModelSymbols(symbols: SymbolDefinition[]) {
    if (!activeProject?.hotellingModel || !session) return;

    const nextSymbols = normalizeSymbolRegistry(symbols);
    const nextProject = markResearchAssetsStaleAfterModelEdit({
      ...activeProject,
      hotellingModel: {
        ...activeProject.hotellingModel,
        symbols: nextSymbols,
      },
      researchSession: {
        ...session,
        assetSummary: {
          ...session.assetSummary,
          pendingDecision: {
            kind: "solve_equilibrium",
            prompt: "符号表已经更新。请重新生成符号均衡，再进入性质分析。",
          },
          nextActions: [
            "检查右侧符号表是否完整",
            "重新生成符号均衡",
            "基于新符号体系重做性质分析",
          ],
        },
        messages: [
          ...session.messages,
          {
            id: createMessageId("msg-symbols-edited"),
            role: "assistant",
            content:
              "符号表已在右侧更新。旧的均衡和性质分析已标记为需要重新检查，建议下一步重新生成符号均衡。",
            createdAt: createTimestamp(),
          },
        ],
      },
    });

    await persistGeneratedProject(nextProject);
    toast.success("符号表已保存", {
      description: "均衡和性质分析已标记为需要重算。",
    });
  }

  async function handleApplyAssetPatch(patchId: string) {
    if (!activeProject?.researchSession) return;

    const patch = activeProject.researchSession.assetPatches?.find(
      (item) => item.id === patchId
    );
    if (!patch) return;

    let nextProject = markPatchStatus(activeProject, patchId, "applied");

    if (patch.kind === "model" && activeProject.hotellingModel) {
      const nextModel = applyModelPatchToHotellingModel(
        activeProject.hotellingModel,
        patch.changes
      );
      nextProject = markResearchAssetsStaleAfterModelEdit({
        ...nextProject,
        hotellingModel: nextModel,
        researchSession: nextProject.researchSession
          ? {
              ...nextProject.researchSession,
              assetSummary: {
                ...nextProject.researchSession.assetSummary,
                confirmedAssumptions: nextModel.assumptions,
                pendingDecision: {
                  kind: "solve_equilibrium",
                  prompt:
                    "模型或符号表已经按建议修改。请重新生成符号均衡，再进入性质分析。",
                },
                nextActions: [
                  "核对右侧模型和符号表",
                  "重新生成符号均衡",
                  "基于新模型重做性质分析",
                ],
              },
              messages: [
                ...nextProject.researchSession.messages,
                {
                  id: createMessageId("msg-asset-patch-applied"),
                  role: "assistant",
                  content:
                    "我已把这条修改建议应用到右侧模型资产里。均衡和性质分析需要重新生成后才适合继续使用。",
                  createdAt: createTimestamp(),
                },
              ],
            }
          : nextProject.researchSession,
      });
    }

    await persistGeneratedProject(nextProject);
    toast.success("修改已应用", {
      description:
        patch.kind === "model"
          ? "模型已更新，均衡和性质分析需要重新生成。"
          : "这类修改已记录为已应用，请继续人工核对右侧资产。",
    });
  }

  async function handleRejectAssetPatch(patchId: string) {
    if (!activeProject?.researchSession) return;

    await persistGeneratedProject(markPatchStatus(activeProject, patchId, "rejected"));
    toast.info("已拒绝修改建议");
  }

  const centerMessages = (() => {
    const baseMessages =
      !activeProject || isComposingNewConversation || !session
        ? []
        : session.messages;

    return optimisticMessage
      ? [...baseMessages, optimisticMessage]
      : baseMessages;
  })();
  const chatTitle =
    !activeProject || isComposingNewConversation
      ? "新的研究对话"
      : activeProject.refinedIdea || activeProject.rawIdea;
  const chatSubtitle =
    !activeProject || isComposingNewConversation
      ? "输入研究想法，PaperForge 会先发现可建模方向"
      : "中间只保留对话，结构化研究资产在右侧检查和编辑";

  return (
    <ResearchWorkspaceShell
      left={
        activeProject ? (
          <ResearchSidebar
            project={activeProject}
            isComposingNewConversation={isComposingNewConversation}
            onStartNewConversation={() => setIsComposingNewConversation(true)}
          />
        ) : (
          <ResearchEmptySidebar />
        )
      }
      center={
        <ChatPanel
          messages={centerMessages}
          isBusy={isBusy}
          onSubmit={handleSubmit}
          headerTitle={chatTitle}
          headerSubtitle={chatSubtitle}
          placeholder={getChatPlaceholder(activeProject, session, isComposingNewConversation)}
          emptyState={
            <NewConversationEmptyState hasExistingProject={Boolean(activeProject)} />
          }
        />
      }
      right={({ isCollapsed, toggleRight }) =>
        session ? (
          <ResearchAssetsPanel
            project={activeProject ?? undefined}
            session={session}
            adoptingDirectionId={adoptingDirectionId}
            isConfirmingModel={isConfirmingModel}
            isSolvingEquilibrium={isSolvingEquilibrium}
            isAnalyzingProperties={isAnalyzingProperties}
            onAdopt={handleAdopt}
            onConfirmModel={handleConfirmModel}
            onSolveEquilibrium={handleSolveEquilibrium}
            onAnalyzeProperties={handleAnalyzeProperties}
            onSaveModelAssumptions={handleSaveModelAssumptions}
            onSaveModelSymbols={handleSaveModelSymbols}
            onApplyAssetPatch={handleApplyAssetPatch}
            onRejectAssetPatch={handleRejectAssetPatch}
            isCollapsed={isCollapsed}
            onTogglePane={toggleRight}
          />
        ) : (
          <ResearchEmptyAssetsPanel />
        )
      }
    />
  );
}

type ApiConversationPatch = NonNullable<GenerateResearchProjectResult["assetPatch"]>;

function attachConversationPatch(
  result: GenerateResearchProjectResult
): ResearchProject {
  const patch = result.assetPatch
    ? convertApiConversationPatch(result.assetPatch)
    : null;
  if (!patch) return result.project;

  const session =
    result.project.researchSession ?? createInitialResearchSession(result.project.rawIdea);

  return {
    ...result.project,
    researchSession: {
      ...session,
      assetPatches: [...(session.assetPatches ?? []), patch],
    },
  };
}

function convertApiConversationPatch(
  patch: ApiConversationPatch
): ResearchAssetPatch | null {
  const kind =
    patch.kind === "update_model"
      ? "model"
      : patch.kind === "update_equilibrium"
        ? "equilibrium"
        : patch.kind === "update_properties"
          ? "properties"
          : null;
  if (!kind || patch.changes.length === 0) return null;

  return {
    id: createPatchId(),
    kind,
    summary: patch.summary,
    status: "proposed",
    createdAt: createTimestamp(),
    changes: patch.changes.map((change) => ({
      kind:
        change.op === "insert"
          ? "append"
          : change.op === "remove"
            ? "remove"
            : "replace",
      path: change.target,
      value: change.value,
      note: change.reason,
    })),
  };
}

function markPatchStatus(
  project: ResearchProject,
  patchId: string,
  status: ResearchAssetPatch["status"]
): ResearchProject {
  const session =
    project.researchSession ?? createInitialResearchSession(project.rawIdea);

  return {
    ...project,
    researchSession: {
      ...session,
      assetPatches: (session.assetPatches ?? []).map((patch) =>
        patch.id === patchId
          ? {
              ...patch,
              status,
              ...(status === "applied" ? { appliedAt: createTimestamp() } : {}),
              ...(status === "rejected" ? { rejectedAt: createTimestamp() } : {}),
            }
          : patch
      ),
    },
  };
}

function createTimestamp() {
  return Date.now();
}

function createMessageId(prefix: string) {
  return `${prefix}-${createTimestamp()}`;
}

function createPatchId() {
  return `patch-${createTimestamp()}-${Math.random().toString(16).slice(2)}`;
}

function markAssetFreshnessAfterEquilibrium(project: ResearchProject): ResearchProject {
  if (!project.researchSession) return project;
  return {
    ...project,
    researchSession: {
      ...project.researchSession,
      assetFreshness: {
        ...(project.researchSession.assetFreshness ?? {
          model: "fresh",
          equilibrium: "fresh",
          properties: "fresh",
        }),
        equilibrium: "fresh",
        properties: "stale",
      },
    },
  };
}

function markAssetFreshnessAfterProperties(project: ResearchProject): ResearchProject {
  if (!project.researchSession) return project;
  return {
    ...project,
    researchSession: {
      ...project.researchSession,
      assetFreshness: {
        ...(project.researchSession.assetFreshness ?? {
          model: "fresh",
          equilibrium: "fresh",
          properties: "fresh",
        }),
        properties: "fresh",
      },
    },
  };
}

function attachChatMessageToProject(
  project: ResearchProject,
  userMessage: string
): ResearchProject {
  const trimmed = userMessage.trim();
  if (!trimmed || !project.researchSession) return project;

  const messages = project.researchSession.messages;
  if (messages.some((message) => message.role === "user" && message.content === trimmed)) {
    return project;
  }

  const insertIndex =
    messages.length > 0 && messages[messages.length - 1].role === "assistant"
      ? messages.length - 1
      : messages.length;

  return {
    ...project,
    researchSession: {
      ...project.researchSession,
      messages: [
        ...messages.slice(0, insertIndex),
        {
          id: createMessageId("msg-user-chat"),
          role: "user",
          content: trimmed,
          createdAt: createTimestamp(),
        },
        ...messages.slice(insertIndex),
      ],
    },
  };
}

function getChatPlaceholder(
  project: ResearchProject | null,
  session: ReturnType<typeof createInitialResearchSession> | null,
  isComposingNewConversation: boolean
) {
  if (isComposingNewConversation || !project) {
    return "输入新的研究想法，例如：二手平台佣金与补贴如何影响买卖双方参与...";
  }

  if (session?.phase === "model") {
    return "可以直接问模型设定，也可以说：把模型假设改成... 但先让我确认";
  }

  return "可以问结果，也可以说：重新求均衡 / 重做性质分析 / 整理成命题";
}

function NewConversationEmptyState({
  hasExistingProject,
}: {
  hasExistingProject: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-[55vh] w-full max-w-3xl flex-col justify-center">
      <div className="flex items-start gap-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
          <MessageSquarePlus className="size-4" />
        </div>
        <div>
          <p className="text-xl font-semibold">
            {hasExistingProject ? "开启新的探索对话" : "从一句研究想法开始"}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            {hasExistingProject
              ? "输入一个新的研究想法后，PaperForge 会把它保存成新的探索记录，再从方向发现开始。"
              : "直接在底部输入研究想法，PaperForge 会依次推进方向发现、模型确认、符号均衡和性质分析。"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResearchEmptySidebar() {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col border-r bg-muted/45">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold">PaperForge</span>
      </div>
      <div className="min-h-0 flex-1 p-3">
        <section className="mb-6">
          <h2 className="mb-2 px-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            探索记录
          </h2>
          <p className="rounded-md border border-dashed bg-background/60 px-3 py-3 text-xs leading-5 text-muted-foreground">
            发送第一条研究想法后，这里会保存新的探索记录。
          </p>
        </section>
      </div>
    </aside>
  );
}

function ResearchEmptyAssetsPanel() {
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col bg-card">
      <div className="border-b px-4 py-4">
        <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <PanelRightOpen className="size-3.5" />
          研究资产
        </p>
        <h2 className="mt-1 text-lg font-semibold">工作台总览</h2>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <div className="rounded-md border border-dashed bg-background/60 px-3 py-3 text-xs leading-5 text-muted-foreground">
          开启研究对话后，方向、模型、均衡和性质分析会显示在这里。
        </div>
      </div>
    </aside>
  );
}
