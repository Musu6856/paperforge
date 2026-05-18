import type { ProjectRow } from "@/db/schema";
import type { ResearchProject } from "./types";

export function projectFromRow(row: ProjectRow): ResearchProject {
  return {
    id: row.id,
    createdAt: row.createdAt.getTime(),
    rawIdea: row.rawIdea,
    refinedIdea: row.refinedIdea,
    model: row.model,
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

  if (
    project.id.length > 100 ||
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
    model: project.model ?? null,
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
