type ResearchIndexProject = {
  id: string;
};

export function getResearchIndexDestination(
  projects: ResearchIndexProject[]
): string | null {
  const firstProject = projects[0];
  return firstProject ? `/research/${firstProject.id}` : null;
}
