import "server-only";

import { randomUUID } from "node:crypto";
import { getDb } from "@/db";
import type { Project } from "@/models";
import { ApiError } from "@/server/api";
import type { ProjectInput } from "./validation";

export async function listProjects(
  userId: string,
  filter: "active" | "archived" | "all",
) {
  const archiveClause =
    filter === "all"
      ? ""
      : filter === "active"
        ? 'AND "archivedAt" IS NULL'
        : 'AND "archivedAt" IS NOT NULL';
  const result = await getDb().query<Project>(
    `SELECT * FROM public.projects WHERE "userId" = $1 ${archiveClause} ORDER BY "position", "id"`,
    [userId],
  );
  return result.rows;
}

export async function reorderProjects(userId: string, projectIds: string[]) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      'SELECT "id" FROM public."user" WHERE "id" = $1 FOR UPDATE',
      [userId],
    );
    const active = await client.query<{ id: string }>(
      'SELECT "id" FROM public.projects WHERE "userId" = $1 AND "archivedAt" IS NULL ORDER BY "id" FOR UPDATE',
      [userId],
    );
    const ids = new Set(projectIds);
    if (
      active.rows.length !== ids.size ||
      active.rows.some((row) => !ids.has(row.id))
    ) {
      throw new ApiError(409, "Projects changed. Refresh and try again.");
    }
    await client.query(
      `UPDATE public.projects AS p
       SET "position" = ordering.ordinality::integer - 1, "updatedAt" = now()
       FROM unnest($2::text[]) WITH ORDINALITY AS ordering(id, ordinality)
       WHERE p."id" = ordering.id AND p."userId" = $1`,
      [userId, projectIds],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createProject(
  userId: string,
  input: ProjectInput,
): Promise<Project> {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    // Serialize appends per user so simultaneous creates get distinct positions.
    await client.query(
      'SELECT "id" FROM public."user" WHERE "id" = $1 FOR UPDATE',
      [userId],
    );
    let position = input.position;
    if (position === undefined) {
      const next = await client.query<{ position: string }>(
        'SELECT (COALESCE(MAX("position"), -1)::bigint + 1)::text AS position FROM public.projects WHERE "userId" = $1',
        [userId],
      );
      position = Number(next.rows[0].position);
      if (position > 2_147_483_647)
        throw new ApiError(409, "Project ordering limit reached");
    }
    const result = await client.query<Project>(
      'INSERT INTO public.projects ("id", "userId", "name", "description", "color", "position") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        randomUUID(),
        userId,
        input.name,
        input.description ?? null,
        input.color ?? "#245C45",
        position,
      ],
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getProject(userId: string, id: string): Promise<Project> {
  const result = await getDb().query<Project>(
    'SELECT * FROM public.projects WHERE "id" = $1 AND "userId" = $2',
    [id, userId],
  );
  if (!result.rows[0]) throw new ApiError(404, "Project not found");
  return result.rows[0];
}

export async function updateProject(
  userId: string,
  id: string,
  input: ProjectInput,
): Promise<Project> {
  const values: unknown[] = [id, userId];
  const assignments: string[] = [];
  for (const key of ["name", "description", "color", "position"] as const) {
    if (input[key] !== undefined) {
      values.push(input[key]);
      assignments.push(`"${key}" = $${values.length}`);
    }
  }
  if (input.archived !== undefined) {
    values.push(input.archived);
    assignments.push(
      `"archivedAt" = CASE WHEN $${values.length}::boolean THEN COALESCE("archivedAt", now()) ELSE NULL END`,
    );
  }
  assignments.push('"updatedAt" = now()');
  const result = await getDb().query<Project>(
    `UPDATE public.projects SET ${assignments.join(", ")} WHERE "id" = $1 AND "userId" = $2 RETURNING *`,
    values,
  );
  if (!result.rows[0]) throw new ApiError(404, "Project not found");
  return result.rows[0];
}

export async function deleteProject(userId: string, id: string): Promise<void> {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    // Match task creation/moves' lock order before locking the project and tasks.
    await client.query(
      'SELECT "id" FROM public."user" WHERE "id" = $1 FOR UPDATE',
      [userId],
    );
    const project = await client.query(
      'SELECT "id" FROM public.projects WHERE "id" = $1 AND "userId" = $2 FOR UPDATE',
      [id, userId],
    );
    if (project.rowCount === 0) throw new ApiError(404, "Project not found");
    await client.query(
      'DELETE FROM public.tasks WHERE "projectId" = $1 AND "userId" = $2',
      [id, userId],
    );
    await client.query(
      'DELETE FROM public.projects WHERE "id" = $1 AND "userId" = $2 RETURNING "id"',
      [id, userId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
