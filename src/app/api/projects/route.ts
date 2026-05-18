import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { projectFromRow, sanitizeProjectPayload } from "@/lib/project-records";

function jsonError(error: string, status: number, code: string) {
  return Response.json({ error, code }, { status });
}

async function requireUserId() {
  const { userId } = await auth();
  return userId;
}

export async function GET() {
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Unauthorized", 401, "unauthorized");

    const rows = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.createdAt));

    return Response.json({ projects: rows.map(projectFromRow) });
  } catch (error) {
    console.error("Projects API error:", error);
    return jsonError("Internal server error", 500, "internal_error");
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    if (!userId) return jsonError("Unauthorized", 401, "unauthorized");

    const body = await request.json();
    const project = sanitizeProjectPayload(body.project);
    if (!project) return jsonError("Invalid project data", 400, "invalid_project");

    const [row] = await getDb()
      .insert(projects)
      .values({
        id: project.id,
        ownerId: userId,
        rawIdea: project.rawIdea,
        refinedIdea: project.refinedIdea,
        model: project.model,
        wizardCompleted: project.wizardCompleted,
        sections: project.sections,
        references: project.references,
        background: project.background ?? null,
        literatureAnalyses: project.literatureAnalyses ?? [],
        hotellingModel: project.hotellingModel ?? null,
        equilibriumResult: project.equilibriumResult ?? null,
        propertyAnalyses: project.propertyAnalyses ?? [],
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(),
      })
      .returning();

    return Response.json({ project: projectFromRow(row) }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return jsonError("Internal server error", 500, "internal_error");
  }
}
