import "server-only";

import { getDb } from "@/db";
import { ApiError } from "@/server/api";

interface OverviewRow {
  timezone: string;
  date: string;
  asOf: Date;
  totalTasks: number;
  todayTasks: number;
  overdueTasks: number;
  completedTasks: number;
}

export async function getOverview(userId: string) {
  // One statement gives all counters the same database snapshot and clock.
  // Convert each local midnight separately so DST days need not be 24 hours.
  const result = await getDb().query<OverviewRow>(
    `WITH settings AS (
      SELECT COALESCE(
        (SELECT name FROM pg_timezone_names WHERE name = u."timezone"), 'UTC'
      ) AS timezone, now() AS instant
      FROM public."user" u WHERE u."id" = $1
    ), local_day AS (
      SELECT *, (instant AT TIME ZONE timezone)::date AS day FROM settings
    ), bounds AS (
      SELECT *, day::timestamp AT TIME ZONE timezone AS start_at,
        (day + 1)::timestamp AT TIME ZONE timezone AS end_at
      FROM local_day
    ), visible_tasks AS (
      SELECT t.* FROM public.tasks t
      LEFT JOIN public.projects p ON p."id" = t."projectId" AND p."userId" = t."userId"
      WHERE t."userId" = $1 AND p."archivedAt" IS NULL
    )
    SELECT b.timezone, b.day::text AS date, b.instant AS "asOf",
      COUNT(t."id")::integer AS "totalTasks",
      COUNT(t."id") FILTER (WHERE t.status <> 'DONE' AND t."dueAt" >= b.start_at AND t."dueAt" < b.end_at)::integer AS "todayTasks",
      COUNT(t."id") FILTER (WHERE t.status <> 'DONE' AND t."dueAt" < b.instant)::integer AS "overdueTasks",
      COUNT(t."id") FILTER (WHERE t.status = 'DONE')::integer AS "completedTasks"
    FROM bounds b LEFT JOIN visible_tasks t ON true
    GROUP BY b.timezone, b.day, b.instant`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new ApiError(401, "Unauthorized");
  return {
    timezone: row.timezone,
    date: row.date,
    asOf: row.asOf,
    summary: {
      totalTasks: row.totalTasks,
      todayTasks: row.todayTasks,
      overdueTasks: row.overdueTasks,
      completedTasks: row.completedTasks,
    },
  };
}
