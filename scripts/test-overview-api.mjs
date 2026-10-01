import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd(), true);
const base = process.env.API_TEST_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const userIds = [];
let checks = 0;

async function signup(timezone) {
  const response = await fetch(base + "/api/auth/sign-up/email", {
    method: "POST",
    headers: { Origin: new URL(base).origin, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Overview fixture", email: `overview-${randomUUID()}@example.com`, password: randomUUID() + "Aa1!", timezone }),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  userIds.push(data.user.id);
  return { id: data.user.id, cookie: response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ") };
}

async function overview(user, query = "", expectedStatus = 200) {
  const response = await fetch(base + "/api/overview" + query, { headers: user ? { Cookie: user.cookie } : {} });
  const data = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(data));
  assert.equal(response.headers.get("cache-control"), "no-store");
  checks++;
  return data;
}

const zeros = { totalTasks: 0, todayTasks: 0, overdueTasks: 0, completedTasks: 0 };
function localDate(instant, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(instant));
  const part = (type) => parts.find((value) => value.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function expectedSummary(userId, data) {
  // Compute the expected counters from fixture records with the response clock.
  const result = await pool.query(
    `SELECT t.status, t."dueAt" FROM public.tasks t
     LEFT JOIN public.projects p ON p."id" = t."projectId" AND p."userId" = t."userId"
     WHERE t."userId" = $1 AND p."archivedAt" IS NULL`, [userId],
  );
  const summary = { ...zeros };
  for (const task of result.rows) {
    summary.totalTasks++;
    if (task.status === "DONE") summary.completedTasks++;
    else if (task.dueAt) {
      if (localDate(task.dueAt, data.timezone) === data.date) summary.todayTasks++;
      if (task.dueAt < new Date(data.asOf)) summary.overdueTasks++;
    }
  }
  assert.deepEqual(data.summary, summary);
  assert.equal(data.date, localDate(data.asOf, data.timezone));
}

try {
  assert.deepEqual(await overview(null, "", 401), { error: "Unauthorized" });
  const owner = await signup("Asia/Bangkok");
  const other = await signup("UTC");
  const empty = await overview(owner);
  assert.equal(empty.timezone, "Asia/Bangkok");
  assert.deepEqual(empty.summary, zeros);
  assert.equal(empty.date, localDate(empty.asOf, "Asia/Bangkok"));

  const activeId = randomUUID(), archivedId = randomUUID();
  await pool.query(
    'INSERT INTO public.projects ("id", "userId", "name", "archivedAt") VALUES ($1, $3, \'Active fixture\', NULL), ($2, $3, \'Archived fixture\', now())',
    [activeId, archivedId, owner.id],
  );
  const boundaryResult = await pool.query(
    `SELECT ((now() AT TIME ZONE 'Asia/Bangkok')::date)::timestamp AT TIME ZONE 'Asia/Bangkok' AS start,
      (((now() AT TIME ZONE 'Asia/Bangkok')::date) + 1)::timestamp AT TIME ZONE 'Asia/Bangkok' AS finish`,
  );
  const { start, finish } = boundaryResult.rows[0];
  const yesterday = new Date(start.getTime() - 1000);
  const endOfToday = new Date(finish.getTime() - 1);
  const fixtures = [
    [owner.id, null, "TODO", null],
    [owner.id, activeId, "TODO", start],
    [owner.id, activeId, "TODO", endOfToday],
    [owner.id, activeId, "TODO", finish],
    [owner.id, null, "TODO", yesterday],
    [owner.id, null, "DONE", yesterday],
    [owner.id, activeId, "DONE", start],
    [owner.id, archivedId, "TODO", yesterday],
    [owner.id, archivedId, "DONE", start],
    [other.id, null, "TODO", yesterday],
  ];
  for (const [userId, projectId, status, dueAt] of fixtures) {
    await pool.query(
      'INSERT INTO public.tasks ("id", "userId", "projectId", "title", "status", "dueAt", "completedAt") VALUES ($1, $2, $3, \'Overview fixture\', $4, $5, CASE WHEN $4 = \'DONE\' THEN now() ELSE NULL END)',
      [randomUUID(), userId, projectId, status, dueAt],
    );
  }
  const populated = await overview(owner);
  await expectedSummary(owner.id, populated);
  assert.equal(populated.summary.totalTasks, 7);
  assert.equal(populated.summary.todayTasks, 2);
  assert.equal(populated.summary.completedTasks, 2);
  assert.ok(populated.summary.overdueTasks >= 2);
  const foreign = await overview(other);
  assert.deepEqual(foreign.summary, { totalTasks: 1, todayTasks: localDate(yesterday, "UTC") === foreign.date ? 1 : 0, overdueTasks: 1, completedTasks: 0 });
  const cannotOverride = await overview(other, "?userId=" + owner.id);
  assert.deepEqual(cannotOverride.summary, foreign.summary);

  // Read the timezone from the current database record, not a stale session value.
  for (const timezone of ["Pacific/Kiritimati", "America/New_York", "Invalid/Timezone", null]) {
    await pool.query('UPDATE public."user" SET "timezone" = $1 WHERE "id" = $2', [timezone, owner.id]);
    const data = await overview(owner);
    assert.equal(data.timezone, timezone === null || timezone === "Invalid/Timezone" ? "UTC" : timezone);
    await expectedSummary(owner.id, data);
  }
  // Archiving hides tasks; restoring immediately includes them again.
  await pool.query('UPDATE public.projects SET "archivedAt" = now() WHERE "id" = $1', [activeId]);
  const archived = await overview(owner);
  await expectedSummary(owner.id, archived);
  assert.equal(archived.summary.totalTasks, 3);
  await pool.query('UPDATE public.projects SET "archivedAt" = NULL WHERE "id" = $1', [activeId]);
  const restored = await overview(owner);
  await expectedSummary(owner.id, restored);
  assert.equal(restored.summary.totalTasks, 7);
  await pool.query('DELETE FROM public.tasks WHERE "userId" = $1', [owner.id]);
  assert.deepEqual((await overview(owner)).summary, zeros);
  console.log(`Overview API integration passed: ${checks} HTTP checks; empty/populated counts, local-day boundaries, completion, unscheduled tasks, ownership, live timezone/fallback and archive/restore.`);
} finally {
  if (userIds.length) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query('DELETE FROM public.tasks WHERE "userId" = ANY($1::text[])', [userIds]);
      await client.query('DELETE FROM public.projects WHERE "userId" = ANY($1::text[])', [userIds]);
      await client.query('DELETE FROM public."user" WHERE "id" = ANY($1::text[])', [userIds]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  await pool.end();
}
