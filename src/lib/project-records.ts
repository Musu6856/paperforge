import type { ProjectRow } from "@/db/schema";
import type {
  ModelSourceMetadata,
  ModelSourceProvider,
  ResearchProject,
} from "./types";

export function projectFromRow(row: ProjectRow): ResearchProject {
  return {
    id: row.id,
    createdAt: row.createdAt.getTime(),
    rawIdea: row.rawIdea,
    refinedIdea: row.refinedIdea,
    projectType: row.projectType,
    model: row.model,
    researchSession: row.researchSession ?? undefined,
    modelSource: row.modelSource ?? undefined,
    wizardCompleted: row.wizardCompleted || row.sections.length > 0,
    sections: row.sections,
    references: row.references,
    background: row.background ?? undefined,
    literatureAnalyses: row.literatureAnalyses ?? [],
    hotellingModel: row.hotellingModel ?? undefined,
    equilibriumResult: row.equilibriumResult ?? undefined,
    propertyAnalyses: row.propertyAnalyses ?? [],
  };
}

const MAX_IDEAL_LENGTH = 5000;
const MAX_REFINED_LENGTH = 20000;
const MAX_SECTIONS = 50;
const MAX_REFERENCES = 100;
const MAX_LITERATURE_ANALYSES = 20;
const MAX_PROPERTY_ANALYSES = 50;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeProjectPayload(value: unknown): ResearchProject | null {
  if (!value || typeof value !== "object") return null;

  const project = value as Partial<ResearchProject>;

  if (
    typeof project.id !== "string" ||
    typeof project.createdAt !== "number" ||
    typeof project.rawIdea !== "string" ||
    typeof project.refinedIdea !== "string" ||
    (project.wizardCompleted !== undefined &&
      typeof project.wizardCompleted !== "boolean") ||
    (project.projectType !== undefined &&
      project.projectType !== "exploration" &&
      project.projectType !== "formal" &&
      project.projectType !== "legacy") ||
    (project.literatureAnalyses !== undefined &&
      !Array.isArray(project.literatureAnalyses)) ||
    (project.propertyAnalyses !== undefined &&
      !Array.isArray(project.propertyAnalyses)) ||
    !Array.isArray(project.sections) ||
    !Array.isArray(project.references)
  ) {
    return null;
  }

  const literatureAnalyses = project.literatureAnalyses ?? [];
  const propertyAnalyses = project.propertyAnalyses ?? [];
  const modelSource = sanitizeModelSourceMetadata(project.modelSource);

  if (
    !UUID_RE.test(project.id) ||
    project.rawIdea.length > MAX_IDEAL_LENGTH ||
    project.refinedIdea.length > MAX_REFINED_LENGTH ||
    project.sections.length > MAX_SECTIONS ||
    project.references.length > MAX_REFERENCES ||
    literatureAnalyses.length > MAX_LITERATURE_ANALYSES ||
    propertyAnalyses.length > MAX_PROPERTY_ANALYSES
  ) {
    return null;
  }

  return {
    id: project.id,
    createdAt: project.createdAt,
    rawIdea: project.rawIdea,
    refinedIdea: project.refinedIdea,
    projectType: project.projectType ?? "legacy",
    model: project.model ?? null,
    researchSession: project.researchSession,
    modelSource,
    wizardCompleted: project.wizardCompleted ?? false,
    sections: project.sections,
    references: project.references,
    background: project.background,
    literatureAnalyses,
    hotellingModel: project.hotellingModel,
    equilibriumResult: project.equilibriumResult,
    propertyAnalyses,
  };
}

function sanitizeModelSourceMetadata(
  value: unknown
): ModelSourceMetadata | undefined {
  if (!value || typeof value !== "object") return undefined;

  const source = value as Partial<
    ModelSourceMetadata & {
      source?: unknown;
      provider?: unknown;
      model?: unknown;
      baseUrl?: unknown;
      hasBrowserApiKey?: unknown;
    }
  >;

  if (source.source === "paperforge") {
    return { source: "paperforge" };
  }

  if (source.source !== "own") return undefined;
  if (typeof source.provider !== "string") return undefined;
  if (!isModelSourceProvider(source.provider)) return undefined;

  const model = cleanString(source.model);
  if (!model) return undefined;

  const metadata: ModelSourceMetadata = {
    source: "own",
    provider: source.provider,
    model,
    hasBrowserApiKey: Boolean(source.hasBrowserApiKey),
  };
  const baseUrl = cleanEndpoint(source.baseUrl);
  if (baseUrl) metadata.baseUrl = baseUrl;

  return metadata;
}

function isModelSourceProvider(value: string): value is ModelSourceProvider {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "openai-compatible" ||
    value === "anthropic-compatible"
  );
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanEndpoint(value: unknown) {
  const endpoint = cleanString(value);
  return endpoint ? endpoint.replace(/\/+$/, "") : "";
}
