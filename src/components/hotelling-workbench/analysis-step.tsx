"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { chatStream } from "@/lib/api";
import { propertyAnalysisPrompt } from "@/lib/prompts";
import { useStore } from "@/lib/store";
import type { PropertyAnalysis, ResearchProject } from "@/lib/types";

type Operation = PropertyAnalysis["operation"];

const OPERATION_LABELS: Record<Operation, string> = {
  differentiate: "Differentiate",
  compare: "Compare",
  threshold: "Threshold",
  custom: "Custom",
};

function linesToList(value: string) {
  if (!value.trim()) return [];
  return value.split(/\r?\n/);
}

function listToLines(value: string[]) {
  return value.join("\n");
}

function createAnalysis(
  target: string,
  parameter: string,
  operation: Operation
): PropertyAnalysis {
  return {
    id: crypto.randomUUID(),
    target,
    parameter,
    operation,
    symbolicResult: "",
    signCondition: "",
    propositionDraft: "",
    proofSketch: "",
    intuition: "",
    warnings: [],
  };
}

export function AnalysisStep({ project }: { project: ResearchProject }) {
  const { dispatch } = useStore();
  const [target, setTarget] = useState("");
  const [parameter, setParameter] = useState("");
  const [operation, setOperation] = useState<Operation>("differentiate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const model = project.hotellingModel;
  const equilibrium = project.equilibriumResult;
  const analyses = project.propertyAnalyses ?? [];
  const hasEquilibriumContext = Boolean(
    equilibrium?.derivation.trim() ||
      equilibrium?.closedForm.trim() ||
      equilibrium?.focs.some((foc) => foc.trim())
  );

  function setAnalyses(nextAnalyses: PropertyAnalysis[]) {
    dispatch({
      type: "SET_PROPERTY_ANALYSES",
      payload: nextAnalyses,
    });
  }

  function updateAnalysis(
    id: string,
    updater: (analysis: PropertyAnalysis) => PropertyAnalysis
  ) {
    if (isGenerating) return;

    setAnalyses(
      analyses.map((analysis) =>
        analysis.id === id ? updater(analysis) : analysis
      )
    );
  }

  function deleteAnalysis(id: string) {
    if (isGenerating) return;

    setAnalyses(analyses.filter((analysis) => analysis.id !== id));
  }

  async function generateAnalysis() {
    if (!model || !hasEquilibriumContext || isGenerating) return;

    const request = {
      target: target.trim(),
      parameter: parameter.trim(),
      operation,
    };

    const hasTargetLikeRequest = Boolean(request.target || request.parameter);

    if (
      (operation === "custom" && !hasTargetLikeRequest) ||
      (operation !== "custom" && (!request.target || !request.parameter))
    ) {
      setError(
        operation === "custom"
          ? "Please specify a custom symbolic request in the target or parameter field."
          : "Please specify both a target expression and parameter for symbolic analysis."
      );
      return;
    }

    setIsGenerating(true);
    setError("");

    const nextAnalysis = createAnalysis(
      request.target || "Custom symbolic target",
      request.parameter || "Custom request",
      operation
    );
    const baseAnalyses = [...analyses, nextAnalysis];
    setAnalyses(baseAnalyses);

    try {
      const prompt = propertyAnalysisPrompt(
        JSON.stringify(
          {
            model,
            equilibrium,
            request,
          },
          null,
          2
        )
      );

      const finalText = await chatStream(
        [{ role: "user", content: prompt }],
        (content) => {
          setAnalyses(
            baseAnalyses.map((analysis) =>
              analysis.id === nextAnalysis.id
                ? { ...analysis, proofSketch: content }
                : analysis
            )
          );
        }
      );

      setAnalyses(
        baseAnalyses.map((analysis) =>
          analysis.id === nextAnalysis.id
            ? { ...analysis, proofSketch: finalText }
            : analysis
        )
      );
      setTarget("");
      setParameter("");
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Provider request failed";

      setError(message);
      setAnalyses(
        baseAnalyses.map((analysis) =>
          analysis.id === nextAnalysis.id
            ? {
                ...analysis,
                warnings: [
                  ...analysis.warnings,
                  `Provider failure: ${message}. No numerical comparative static was generated; simplify the expression or add sign assumptions.`,
                ],
              }
            : analysis
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="flex min-h-[520px] min-w-0 flex-col gap-4">
      <header className="border-b pb-3">
        <p className="text-xs font-medium text-muted-foreground">Analysis</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h3 className="break-words text-base font-semibold">
            Symbolic property analysis
          </h3>
          <Button
            size="sm"
            onClick={generateAnalysis}
            disabled={!model || !hasEquilibriumContext || isGenerating}
          >
            <Wand2 aria-hidden="true" />
            {isGenerating ? "生成中" : "生成符号性质分析"}
          </Button>
        </div>
      </header>

      <div className="flex min-w-0 gap-2 border-l-2 border-amber-500/70 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-900 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 break-words">
          Symbolic analysis only: derivative, symbolic comparison, threshold,
          sign condition, proposition, and proof sketch. V1 does not include
          numerical simulation or numerical comparative statics.
        </p>
      </div>

      {!model ? (
        <p className="border-l border-dashed pl-3 text-sm leading-6 text-muted-foreground">
          Build the Hotelling model first, then solve symbolic equilibrium
          before requesting property analysis.
        </p>
      ) : !hasEquilibriumContext ? (
        <p className="border-l border-dashed pl-3 text-sm leading-6 text-muted-foreground">
          Add a symbolic equilibrium derivation or closed-form result first.
          Property analysis needs symbolic expressions to differentiate,
          compare, or threshold.
        </p>
      ) : null}

      {error ? (
        <p className="border-l border-destructive pl-3 text-sm leading-6 text-destructive">
          Generation failed: {error}
        </p>
      ) : null}

      <section className="grid min-w-0 gap-3 border-b pb-4 md:grid-cols-4">
        <div className="grid min-w-0 gap-1.5 md:col-span-2">
          <Label htmlFor="analysis-target" className="text-xs">
            Target expression
          </Label>
          <Input
            id="analysis-target"
            value={target}
            onChange={(event) => setTarget(event.currentTarget.value)}
            disabled={isGenerating}
            placeholder="e.g. p_A^*, profit_A^* - profit_B^*"
            className="text-sm"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="analysis-parameter" className="text-xs">
            Parameter
          </Label>
          <Input
            id="analysis-parameter"
            value={parameter}
            onChange={(event) => setParameter(event.currentTarget.value)}
            disabled={isGenerating}
            placeholder="e.g. t, alpha, beta"
            className="text-sm"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="analysis-operation" className="text-xs">
            Operation
          </Label>
          <select
            id="analysis-operation"
            value={operation}
            onChange={(event) =>
              setOperation(event.currentTarget.value as Operation)
            }
            disabled={isGenerating}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {Object.entries(OPERATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="min-w-0 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Property analyses: {analyses.length}
        </p>

        {analyses.length === 0 ? (
          <p className="border-l border-dashed pl-3 text-sm leading-6 text-muted-foreground">
            No analyses yet. Choose a target expression and operation to create
            a proposition-ready symbolic result.
          </p>
        ) : (
          <div className="min-w-0 divide-y rounded-lg border">
            {analyses.map((analysis, index) => (
              <article key={analysis.id} className="min-w-0 space-y-3 p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="break-words text-sm font-medium leading-5">
                      {OPERATION_LABELS[analysis.operation]}:{" "}
                      {analysis.target || "Untitled symbolic target"}
                    </h4>
                    <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                      Parameter: {analysis.parameter || "not specified"} · #
                      {index + 1}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => deleteAnalysis(analysis.id)}
                    disabled={isGenerating}
                    aria-label={`Delete analysis ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>

                <div className="grid min-w-0 gap-2 md:grid-cols-3">
                  <AnalysisInput
                    id={`${analysis.id}-target`}
                    label="Target"
                    value={analysis.target}
                    disabled={isGenerating}
                    onChange={(value) =>
                      updateAnalysis(analysis.id, (current) => ({
                        ...current,
                        target: value,
                      }))
                    }
                  />
                  <AnalysisInput
                    id={`${analysis.id}-parameter`}
                    label="Parameter"
                    value={analysis.parameter}
                    disabled={isGenerating}
                    onChange={(value) =>
                      updateAnalysis(analysis.id, (current) => ({
                        ...current,
                        parameter: value,
                      }))
                    }
                  />
                  <div className="grid min-w-0 gap-1.5">
                    <Label
                      htmlFor={`${analysis.id}-operation`}
                      className="text-xs"
                    >
                      Operation
                    </Label>
                    <select
                      id={`${analysis.id}-operation`}
                      value={analysis.operation}
                      onChange={(event) =>
                        updateAnalysis(analysis.id, (current) => ({
                          ...current,
                          operation: event.currentTarget.value as Operation,
                        }))
                      }
                      disabled={isGenerating}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {Object.entries(OPERATION_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid min-w-0 gap-2 md:grid-cols-2">
                  <AnalysisTextarea
                    id={`${analysis.id}-symbolic-result`}
                    label="Symbolic result"
                    value={analysis.symbolicResult}
                    disabled={isGenerating}
                    onChange={(value) =>
                      updateAnalysis(analysis.id, (current) => ({
                        ...current,
                        symbolicResult: value,
                      }))
                    }
                  />
                  <AnalysisTextarea
                    id={`${analysis.id}-sign-condition`}
                    label="Sign or threshold condition"
                    value={analysis.signCondition}
                    disabled={isGenerating}
                    onChange={(value) =>
                      updateAnalysis(analysis.id, (current) => ({
                        ...current,
                        signCondition: value,
                      }))
                    }
                  />
                  <AnalysisTextarea
                    id={`${analysis.id}-proposition`}
                    label="Proposition draft"
                    value={analysis.propositionDraft}
                    disabled={isGenerating}
                    onChange={(value) =>
                      updateAnalysis(analysis.id, (current) => ({
                        ...current,
                        propositionDraft: value,
                      }))
                    }
                  />
                  <AnalysisTextarea
                    id={`${analysis.id}-intuition`}
                    label="Economic intuition"
                    value={analysis.intuition}
                    disabled={isGenerating}
                    onChange={(value) =>
                      updateAnalysis(analysis.id, (current) => ({
                        ...current,
                        intuition: value,
                      }))
                    }
                  />
                </div>

                <AnalysisTextarea
                  id={`${analysis.id}-proof`}
                  label="Proof sketch"
                  value={analysis.proofSketch}
                  disabled={isGenerating}
                  onChange={(value) =>
                    updateAnalysis(analysis.id, (current) => ({
                      ...current,
                      proofSketch: value,
                    }))
                  }
                  rows={6}
                />

                <AnalysisTextarea
                  id={`${analysis.id}-warnings`}
                  label="Warnings, one per line"
                  value={listToLines(analysis.warnings)}
                  disabled={isGenerating}
                  onChange={(value) =>
                    updateAnalysis(analysis.id, (current) => ({
                      ...current,
                      warnings: linesToList(value),
                    }))
                  }
                  rows={3}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function AnalysisInput({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        className="text-sm"
      />
    </div>
  );
}

function AnalysisTextarea({
  id,
  label,
  value,
  onChange,
  rows = 4,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        rows={rows}
        className="min-h-24 resize-y text-sm leading-5"
      />
    </div>
  );
}
