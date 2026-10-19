import "server-only";

import { getDb } from "@/server/db";
import { ApiError } from "@/lib/api";

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
  try {
    return await queryOverview(userId, null);
  } catch (error) {
    // 22023 = invalid_parameter_value, e.g. a legacy row with an unknown zone.
    // Avoid pg_timezone_names: it re-reads the tz database on every query.
    if ((error as { code?: string }).code !== "22023") throw error;
    return queryOverview(userId, "UTC");
  }
}

async function queryOverview(userId: string, timezoneOverride: string | null) {
  // One statement gives all counters the same database snapshot and clock.
  // Convert each local midnight separately so DST days need not be 24 hours.
  const result = await getDb().query<OverviewRow>(
    `WITH settings AS (
      SELECT COALESCE($2::text, NULLIF(u."timezone", ''), 'UTC') AS timezone,
        now() AS instant
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
    [userId, timezoneOverride],
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
