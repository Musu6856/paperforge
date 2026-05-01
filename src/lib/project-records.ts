import type { ProjectRow } from "@/db/schema";
import type { ResearchProject } from "./types";

export function projectFromRow(row: ProjectRow): ResearchProject {
  return {
    id: row.id,
    createdAt: row.createdAt.getTime(),
    rawIdea: row.rawIdea,
    refinedIdea: row.refinedIdea,
    model: row.model,
    sections: row.sections,
    references: row.references,
  };
}

const MAX_IDEAL_LENGTH = 5000;
const MAX_REFINED_LENGTH = 20000;
const MAX_SECTIONS = 50;
const MAX_REFERENCES = 100;

export function sanitizeProjectPayload(value: unknown): ResearchProject | null {
  if (!value || typeof value !== "object") return null;

  const project = value as Partial<ResearchProject>;

  if (
    typeof project.id !== "string" ||
    typeof project.createdAt !== "number" ||
    typeof project.rawIdea !== "string" ||
    typeof project.refinedIdea !== "string" ||
    !Array.isArray(project.sections) ||
    !Array.isArray(project.references)
  ) {
    return null;
  }

  if (
    project.id.length > 100 ||
    project.rawIdea.length > MAX_IDEAL_LENGTH ||
    project.refinedIdea.length > MAX_REFINED_LENGTH ||
    project.sections.length > MAX_SECTIONS ||
    project.references.length > MAX_REFERENCES
  ) {
    return null;
  }

  return {
    id: project.id,
    createdAt: project.createdAt,
    rawIdea: project.rawIdea,
    refinedIdea: project.refinedIdea,
    model: project.model ?? null,
    sections: project.sections,
    references: project.references,
  };
}
