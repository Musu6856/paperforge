type ResearchIndexProject = {
  id: string;
};

export function getResearchIndexDestination(
  projects: ResearchIndexProject[],
  options: { composeNew?: boolean } = {}
): string | null {
  if (options.composeNew) {
    return null;
  }

  const firstProject = projects[0];
  return firstProject ? `/research/${firstProject.id}` : null;
}
