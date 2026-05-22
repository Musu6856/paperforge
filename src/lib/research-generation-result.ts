import type { GenerateResearchProjectResult } from "./api";
import type { ResearchProject } from "./types";

export function getPersistableResearchProject(
  result: GenerateResearchProjectResult
): ResearchProject | null {
  if (result.usedFallback) {
    return null;
  }

  return result.project;
}
