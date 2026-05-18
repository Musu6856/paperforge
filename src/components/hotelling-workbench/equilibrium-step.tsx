"use client";

import { useState } from "react";
import { AlertTriangle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { chatStream } from "@/lib/api";
import { createIdleEquilibrium } from "@/lib/hotelling-defaults";
import { equilibriumSolvePrompt } from "@/lib/prompts";
import { useStore } from "@/lib/store";
import type { EquilibriumResult, ResearchProject } from "@/lib/types";
import { CodeBlock } from "./code-block";

function linesToList(value: string) {
  if (!value.trim()) return [];
  return value.split(/\r?\n/);
}

function listToLines(value: string[]) {
  return value.join("\n");
}

export function EquilibriumStep({ project }: { project: ResearchProject }) {
  const { dispatch } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const model = project.hotellingModel;
  const equilibrium = project.equilibriumResult ?? createIdleEquilibrium();

  function setEquilibrium(nextEquilibrium: EquilibriumResult) {
    dispatch({
      type: "SET_EQUILIBRIUM_RESULT",
      payload: nextEquilibrium,
    });
  }

  function updateEquilibrium(nextFields: Partial<EquilibriumResult>) {
    setEquilibrium({
      ...equilibrium,
      ...nextFields,
    });
  }

  async function generateDerivation() {
    if (!model || isGenerating) return;

    setIsGenerating(true);
    setError("");

    const baseResult: EquilibriumResult = {
      ...createIdleEquilibrium(),
      ...equilibrium,
      status: "idle",
      derivation: "",
      warnings: equilibrium.warnings,
    };

    setEquilibrium(baseResult);

    try {
      const prompt = equilibriumSolvePrompt(JSON.stringify(model, null, 2));
      const finalText = await chatStream(
        [{ role: "user", content: prompt }],
        (content) => {
          setEquilibrium({
            ...baseResult,
            status: "needs_revision",
            derivation: content,
          });
        }
      );

      setEquilibrium({
        ...baseResult,
        status: "needs_revision",
        derivation: finalText,
      });
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Provider request failed";

      setError(message);
      setEquilibrium({
        ...baseResult,
        status: "needs_revision",
        warnings: [
          ...baseResult.warnings,
          `Provider failure: ${message}. No numerical substitute was generated; simplify the model or try again.`,
        ],
      });
    } finally {
      setIsGenerating(false);
    }
  }

  if (!model) {
    return (
      <section className="flex min-h-[520px] min-w-0 flex-col gap-4">
        <header className="border-b pb-3">
          <p className="text-xs font-medium text-muted-foreground">
            Equilibrium
          </p>
          <h3 className="mt-1 break-words text-base font-semibold">
            Symbolic equilibrium solving
          </h3>
        </header>
        <p className="border-l border-dashed pl-3 text-sm leading-6 text-muted-foreground">
          Build the Hotelling model first. Equilibrium solving needs the
          structured symbols, demand construction, timing, and profit functions.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-[520px] min-w-0 flex-col gap-4">
      <header className="border-b pb-3">
        <p className="text-xs font-medium text-muted-foreground">
          Equilibrium
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h3 className="break-words text-base font-semibold">
            Symbolic equilibrium derivation
          </h3>
          <Button
            size="sm"
            onClick={generateDerivation}
            disabled={isGenerating}
          >
            <Wand2 aria-hidden="true" />
            {isGenerating ? "生成中" : "生成符号均衡推导"}
          </Button>
        </div>
      </header>

      <div className="flex min-w-0 gap-2 border-l-2 border-amber-500/70 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-900 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 break-words">
          Symbolic analytic results only. This step must not treat numerical
          substitution, simulation, or calibrated examples as equilibrium. If
          closed forms become unmanageable, record the symbolic failure and
          simplify assumptions, timing, or parameter scope.
        </p>
      </div>

      {error ? (
        <p className="border-l border-destructive pl-3 text-sm leading-6 text-destructive">
          Generation failed: {error}
        </p>
      ) : null}

      <section className="grid min-w-0 gap-3 md:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="equilibrium-concept" className="text-xs">
            Equilibrium concept
          </Label>
          <Input
            id="equilibrium-concept"
            value={equilibrium.concept}
            onChange={(event) =>
              updateEquilibrium({ concept: event.currentTarget.value })
            }
            disabled={isGenerating}
            className="text-sm"
          />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="equilibrium-status" className="text-xs">
            Status
          </Label>
          <select
            id="equilibrium-status"
            value={equilibrium.status}
            onChange={(event) =>
              updateEquilibrium({
                status: event.currentTarget
                  .value as EquilibriumResult["status"],
              })
            }
            disabled={isGenerating}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="idle">Idle</option>
            <option value="solved">Solved</option>
            <option value="needs_revision">Needs revision</option>
            <option value="symbolic_failure">Symbolic failure</option>
          </select>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-2">
        <EditableList
          id="equilibrium-solving-steps"
          label="Solving steps, one per line"
          value={equilibrium.solvingSteps}
          onChange={(solvingSteps) => updateEquilibrium({ solvingSteps })}
          disabled={isGenerating}
        />
        <EditableList
          id="equilibrium-focs"
          label="FOCs, one per line"
          value={equilibrium.focs}
          onChange={(focs) => updateEquilibrium({ focs })}
          disabled={isGenerating}
        />
      </section>

      <section className="grid min-w-0 gap-3 md:grid-cols-2">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="equilibrium-closed-form" className="text-xs">
            Closed-form equilibrium
          </Label>
          <Textarea
            id="equilibrium-closed-form"
            value={equilibrium.closedForm}
            onChange={(event) =>
              updateEquilibrium({ closedForm: event.currentTarget.value })
            }
            disabled={isGenerating}
            rows={5}
            placeholder="Symbolic closed-form expressions only."
            className="min-h-28 resize-y font-mono text-sm leading-6"
          />
        </div>
        <EditableList
          id="equilibrium-conditions"
          label="Conditions, one per line"
          value={equilibrium.conditions}
          onChange={(conditions) => updateEquilibrium({ conditions })}
          disabled={isGenerating}
          rows={5}
        />
      </section>

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor="equilibrium-derivation" className="text-xs">
          Streamed derivation
        </Label>
        <Textarea
          id="equilibrium-derivation"
          value={equilibrium.derivation}
          onChange={(event) =>
            updateEquilibrium({ derivation: event.currentTarget.value })
          }
          disabled={isGenerating}
          rows={9}
          placeholder="Generated symbolic derivation will stream here."
          className="min-h-52 resize-y text-sm leading-6"
        />
      </div>

      <section className="grid min-w-0 gap-3 border-t pt-4 md:grid-cols-2">
        <EditableList
          id="equilibrium-warnings"
          label="Warnings, one per line"
          value={equilibrium.warnings}
          onChange={(warnings) => updateEquilibrium({ warnings })}
          disabled={isGenerating}
          rows={5}
        />
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="equilibrium-code" className="text-xs">
            SymPy code
          </Label>
          <Textarea
            id="equilibrium-code"
            value={equilibrium.code}
            onChange={(event) =>
              updateEquilibrium({ code: event.currentTarget.value })
            }
            disabled={isGenerating}
            rows={5}
            className="min-h-28 resize-y font-mono text-sm leading-5"
          />
        </div>
      </section>

      <CodeBlock code={equilibrium.code} />
    </section>
  );
}

function EditableList({
  id,
  label,
  value,
  onChange,
  rows = 4,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
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
        value={listToLines(value)}
        onChange={(event) => onChange(linesToList(event.currentTarget.value))}
        disabled={disabled}
        rows={rows}
        className="min-h-24 resize-y text-sm leading-5"
      />
    </div>
  );
}
