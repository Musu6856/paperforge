import type { GenerateResearchProjectResult } from "./api";
import type { ResearchProject } from "./types";

export function getPersistableResearchProject(
  result: GenerateResearchProjectResult
): ResearchProject | null {
  if (result.usedFallback && !hasPersistableFallbackAsset(result.project)) {
    return null;
  }

  return result.project;
}

function hasPersistableFallbackAsset(project: ResearchProject) {
  const phase = project.researchSession?.phase;
  const equilibriumStatus = project.equilibriumResult?.status;
  const hasPropertyAnalyses = Boolean(project.propertyAnalyses?.length);

  return (
    phase === "analysis" &&
    (equilibriumStatus === "solved" ||
      equilibriumStatus === "symbolic_failure" ||
      hasPropertyAnalyses)
  );
}
