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
