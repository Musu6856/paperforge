"use client";

import { useMemo, useState } from "react";
import type { ResearchProject } from "@/lib/types";
import { CodeBlock } from "./code-block";
import { WorkbenchShell, type WorkbenchStep } from "./workbench-shell";

const STEP_COPY: Record<
  WorkbenchStep,
  {
    label: string;
    mainTitle: string;
    mainBody: string;
    sideTitle: string;
    sideBody: string;
  }
> = {
  background: {
    label: "背景故事",
    mainTitle: "研究情境编辑区",
    mainBody:
      "这里将承载背景故事、研究谜题与 Hotelling 直觉的结构化编辑器。",
    sideTitle: "背景输出",
    sideBody: "后续会在这里沉淀可直接进入论文引言的背景草稿。",
  },
  literature: {
    label: "文献启发",
    mainTitle: "文献拆解编辑区",
    mainBody:
      "这里将用于记录参考文献的模型结构、效用设计、均衡方法与可借鉴思路。",
    sideTitle: "文献输出",
    sideBody: "后续会在这里整理文献启发与差异化切入点。",
  },
  model: {
    label: "模型建立",
    mainTitle: "Hotelling 模型编辑区",
    mainBody:
      "这里将接入符号表、参与边、平台、时序、效用函数与利润函数编辑器。",
    sideTitle: "模型输出",
    sideBody: "后续会在这里生成模型设定草稿与符号代码片段。",
  },
  equilibrium: {
    label: "均衡求解",
    mainTitle: "均衡求解编辑区",
    mainBody:
      "这里将呈现一阶条件、求解步骤、闭式解与需要修正的约束条件。",
    sideTitle: "求解代码",
    sideBody: "均衡代码生成后会显示在下方，方便复制复用。",
  },
  analysis: {
    label: "性质分析",
    mainTitle: "性质分析编辑区",
    mainBody:
      "这里将支持比较静态、阈值条件、命题草稿与证明思路的整理。",
    sideTitle: "分析输出",
    sideBody: "后续会在这里汇总命题、证明草稿与经济直觉。",
  },
};

export function HotellingWorkbench({ project }: { project: ResearchProject }) {
  const [activeStep, setActiveStep] = useState<WorkbenchStep>("background");
  const copy = STEP_COPY[activeStep];
  const code = project.equilibriumResult?.code ?? "";

  const title = useMemo(() => {
    const sourceTitle =
      project.hotellingModel?.modelSetupDraft ||
      project.background?.scenario ||
      project.refinedIdea ||
      project.rawIdea;

    return sourceTitle ? `Hotelling 工作台 - ${sourceTitle}` : "Hotelling 工作台";
  }, [project]);

  return (
    <WorkbenchShell
      activeStep={activeStep}
      onStepChange={setActiveStep}
      title={title}
      main={<WorkbenchPlaceholder copy={copy} project={project} />}
      side={<OutputPlaceholder copy={copy} code={activeStep === "equilibrium" ? code : ""} />}
    />
  );
}

function WorkbenchPlaceholder({
  copy,
  project,
}: {
  copy: (typeof STEP_COPY)[WorkbenchStep];
  project: ResearchProject;
}) {
  return (
    <div className="flex min-h-[520px] flex-col">
      <div className="border-b pb-3">
        <p className="text-xs font-medium text-muted-foreground">{copy.label}</p>
        <h3 className="mt-1 text-base font-semibold">{copy.mainTitle}</h3>
      </div>

      <div className="grid flex-1 place-items-center py-8">
        <div className="w-full max-w-xl rounded-md border bg-muted/20 p-4">
          <p className="text-sm leading-6 text-foreground">{copy.mainBody}</p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            当前项目：
            <span className="font-medium text-foreground">
              {project.refinedIdea || project.rawIdea || "未命名研究项目"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function OutputPlaceholder({
  copy,
  code,
}: {
  copy: (typeof STEP_COPY)[WorkbenchStep];
  code: string;
}) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-3">
        <p className="text-xs font-medium text-muted-foreground">{copy.label}</p>
        <h3 className="mt-1 text-sm font-semibold">{copy.sideTitle}</h3>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">{copy.sideBody}</p>
      <CodeBlock code={code} />
    </div>
  );
}
