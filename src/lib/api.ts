import type { GameTheoryModel } from "./types";
import type { ResearchProject } from "./types";

const BASE_URL = "/api";

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function chatStream(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No reader available");

  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    full += text;
    onChunk(full);
  }

  return full;
}

export async function generateFromPrompt(prompt: string): Promise<string> {
  return chatStream([{ role: "user", content: prompt }], () => {});
}

export async function fetchLiterature(
  model: GameTheoryModel
): Promise<string> {
  const res = await fetch(`${BASE_URL}/literature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data = await res.json();
  return data.content;
}

export async function fetchProjects(): Promise<ResearchProject[]> {
  const data = await readJson<{ projects: ResearchProject[] }>(
    await fetch(`${BASE_URL}/projects`)
  );

  return data.projects;
}

export async function fetchProject(id: string): Promise<ResearchProject> {
  const data = await readJson<{ project: ResearchProject }>(
    await fetch(`${BASE_URL}/projects/${id}`)
  );

  return data.project;
}

export async function createProject(
  project: ResearchProject
): Promise<ResearchProject> {
  const data = await readJson<{ project: ResearchProject }>(
    await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    })
  );

  return data.project;
}

export async function createExplorationProjectApi(
  project: ResearchProject
): Promise<ResearchProject> {
  return createProject(project);
}

export async function saveProject(
  project: ResearchProject
): Promise<ResearchProject> {
  const data = await readJson<{ project: ResearchProject }>(
    await fetch(`${BASE_URL}/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    })
  );

  return data.project;
}
