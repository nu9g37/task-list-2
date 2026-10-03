import "server-only";
import {
  buildOverview,
  buildProjectOverview,
  type ApiTask,
  type OverviewUser,
} from "@/components/overview/overview-data";
import { listProjects } from "@/server/projects/service";
import { listTasks } from "@/server/tasks/service";
import { getOverview } from "@/server/overview/service";
import { ApiError } from "@/server/api";
import { measure } from "@/server/timing";

export async function getWorkspace(user: OverviewUser, projectId?: string) {
  const [overview, projects, rows] = await Promise.all([
    measure("summary", () => getOverview(user.id)),
    measure("projects", () => listProjects(user.id, "active")),
    measure("tasks", () => listTasks(user.id, { archived: "active" })),
  ]);
  if (projectId && !projects.some((p) => p.id === projectId))
    throw new ApiError(404, "Project not found");
  const tasks: ApiTask[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    projectId: t.projectId,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    positionOverview: t.positionOverview,
    positionProject: t.positionProject,
  }));
  const safeProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    description: p.description,
    position: p.position,
  }));
  const safeUser: OverviewUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    timezone: user.timezone ?? "UTC",
  };
  const snapshot = { ...overview, asOf: overview.asOf.toISOString() };
  return projectId
    ? buildProjectOverview(
        safeUser,
        snapshot,
        safeProjects,
        tasks,
        projectId,
        [...tasks].sort(
          (a, b) =>
            a.positionProject - b.positionProject || a.id.localeCompare(b.id),
        ),
      )
    : buildOverview(safeUser, snapshot, safeProjects, tasks);
}
