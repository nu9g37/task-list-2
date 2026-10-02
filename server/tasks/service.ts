import "server-only";

import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getDb } from "@/db";
import type { Task } from "@/models";
import { ApiError } from "@/server/api";
import type { TaskFilters, TaskInput } from "./validation";

export async function listTasks(
  userId: string,
  filters: TaskFilters,
): Promise<Task[]> {
  const values: unknown[] = [userId];
  const clauses = ['t."userId" = $1'];
  if (filters.archived === "active") clauses.push('p."archivedAt" IS NULL');
  if (filters.archived === "archived")
    clauses.push('p."archivedAt" IS NOT NULL');
  if (filters.projectId === null) clauses.push('t."projectId" IS NULL');
  else if (filters.projectId !== undefined) {
    values.push(filters.projectId);
    clauses.push(`t."projectId" = $${values.length}`);
  }
  for (const key of ["status", "priority"] as const) {
    if (filters[key] !== undefined) {
      values.push(filters[key]);
      clauses.push(`t."${key}" = $${values.length}`);
    }
  }
  for (const key of ["dueFrom", "dueTo"] as const) {
    if (filters[key] !== undefined) {
      values.push(filters[key]);
      clauses.push(
        `t."dueAt" ${key === "dueFrom" ? ">=" : "<"} $${values.length}`,
      );
    }
  }
  const result = await getDb().query<Task>(
    `SELECT t.* FROM public.tasks t LEFT JOIN public.projects p ON p."id" = t."projectId" AND p."userId" = t."userId" WHERE ${clauses.join(" AND ")} ORDER BY t."position", t."id"`,
    values,
  );
  return result.rows;
}

async function checkProject(
  client: PoolClient,
  userId: string,
  projectId: string | null,
) {
  if (projectId === null) return;
  // Prevent archive/delete from racing assignment until this transaction commits.
  const result = await client.query<{ archivedAt: Date | null }>(
    'SELECT "archivedAt" FROM public.projects WHERE "id" = $1 AND "userId" = $2 FOR SHARE',
    [projectId, userId],
  );
  if (!result.rows[0]) throw new ApiError(404, "Project not found");
  if (result.rows[0].archivedAt)
    throw new ApiError(
      409,
      "Cannot add or move tasks into an archived project",
    );
}

async function nextPosition(
  client: PoolClient,
  userId: string,
  projectId: string | null,
): Promise<number> {
  const result = await client.query<{ position: string }>(
    'SELECT (COALESCE(MAX("position"), -1)::bigint + 1)::text AS position FROM public.tasks WHERE "userId" = $1 AND "projectId" IS NOT DISTINCT FROM $2::text',
    [userId, projectId],
  );
  const position = Number(result.rows[0].position);
  if (position > 2_147_483_647)
    throw new ApiError(409, "Task ordering limit reached");
  return position;
}

export async function createTask(
  userId: string,
  input: TaskInput,
): Promise<Task> {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      'SELECT "id" FROM public."user" WHERE "id" = $1 FOR UPDATE',
      [userId],
    );
    const projectId = input.projectId ?? null;
    await checkProject(client, userId, projectId);
    const position =
      input.position ?? (await nextPosition(client, userId, projectId));
    const result = await client.query<Task>(
      'INSERT INTO public.tasks ("id", "userId", "projectId", "title", "description", "status", "priority", "dueAt", "completedAt", "position") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $6 = \'DONE\' THEN now() ELSE NULL END, $9) RETURNING *',
      [
        randomUUID(),
        userId,
        projectId,
        input.title,
        input.description ?? null,
        input.status ?? "TODO",
        input.priority ?? "MEDIUM",
        input.dueAt ?? null,
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

export async function getTask(userId: string, id: string): Promise<Task> {
  const result = await getDb().query<Task>(
    'SELECT * FROM public.tasks WHERE "id" = $1 AND "userId" = $2',
    [id, userId],
  );
  if (!result.rows[0]) throw new ApiError(404, "Task not found");
  return result.rows[0];
}

export async function updateTask(
  userId: string,
  id: string,
  input: TaskInput,
): Promise<Task> {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    // Use the same lock order as creation to serialize group appends and moves.
    await client.query(
      'SELECT "id" FROM public."user" WHERE "id" = $1 FOR UPDATE',
      [userId],
    );
    const current = await client.query<Task>(
      'SELECT * FROM public.tasks WHERE "id" = $1 AND "userId" = $2 FOR UPDATE',
      [id, userId],
    );
    if (!current.rows[0]) throw new ApiError(404, "Task not found");
    const changes = { ...input };
    if (
      input.projectId !== undefined &&
      input.projectId !== current.rows[0].projectId
    ) {
      await checkProject(client, userId, input.projectId);
      if (input.position === undefined)
        changes.position = await nextPosition(client, userId, input.projectId);
    }
    const values: unknown[] = [id, userId];
    const assignments: string[] = [];
    for (const key of [
      "title",
      "description",
      "projectId",
      "status",
      "priority",
      "dueAt",
      "position",
    ] as const) {
      if (changes[key] !== undefined) {
        values.push(changes[key]);
        assignments.push(`"${key}" = $${values.length}`);
      }
    }
    if (input.status !== undefined) {
      values.push(input.status);
      assignments.push(
        `"completedAt" = CASE WHEN $${values.length}::text = 'DONE' THEN COALESCE("completedAt", now()) ELSE NULL END`,
      );
    }
    assignments.push('"updatedAt" = now()');
    const result = await client.query<Task>(
      `UPDATE public.tasks SET ${assignments.join(", ")} WHERE "id" = $1 AND "userId" = $2 RETURNING *`,
      values,
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

export async function deleteTask(userId: string, id: string): Promise<void> {
  const result = await getDb().query(
    'DELETE FROM public.tasks WHERE "id" = $1 AND "userId" = $2 RETURNING "id"',
    [id, userId],
  );
  if (result.rowCount === 0) throw new ApiError(404, "Task not found");
}
