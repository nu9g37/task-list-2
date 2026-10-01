import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";
import ts from "typescript";

nextEnv.loadEnvConfig(process.cwd(), true);
const source = await readFile("components/overview/overview-data.ts", "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { buildOverview, loadOverview, OverviewRequestError } = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
const base = process.env.API_TEST_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const userIds = [];

function task(id, options = {}) {
  return { id, title: id, projectId: "p", status: "TODO", priority: "MEDIUM", dueAt: null, completedAt: null, position: 0, ...options };
}

// Fixed dates exercise Monday's week boundary and Bangkok's UTC date rollover.
const asOf = "2026-10-04T18:00:00.000Z"; // Monday Oct 5, 01:00 Bangkok.
const user = { id: "u", name: "Alex Kim", email: "fixture@example.com", image: null, timezone: "Asia/Bangkok" };
const snapshot = { timezone: "Asia/Bangkok", date: "2026-10-05", asOf, summary: { totalTasks: 6, todayTasks: 1, overdueTasks: 0, completedTasks: 3 } };
const fixtures = [
  task("due-today", { dueAt: "2026-10-05T02:00:00.000Z", priority: "HIGH" }),
  task("done-today", { dueAt: "2026-10-04T17:00:00.000Z", status: "DONE", completedAt: "2026-10-04T17:30:00.000Z" }),
  task("previous-week", { status: "DONE", completedAt: "2026-10-04T16:59:59.000Z" }),
  task("older", { status: "DONE", completedAt: "2026-09-20T00:00:00.000Z" }),
  task("next-week", { dueAt: "2026-10-11T17:00:00.000Z" }),
  task("personal", { projectId: null }),
];
const view = buildOverview(user, snapshot, [{ id: "p", name: "Project", color: "#245C45" }, { id: "empty", name: "Empty", color: "#ABCDEF" }], fixtures);
assert.equal(view.date, "2026-10-05");
assert.equal(view.greeting, "Good morning");
assert.equal(view.completedThisWeek, 1);
assert.equal(view.weekDifference, 0);
assert.equal(view.upcomingCount, 1);
assert.equal(view.upcoming.title, "due-today");
assert.equal(view.upcoming.label, "Today, 9:00 AM");
assert.equal(view.todayTasks.length, 2);
assert.equal(view.todayTasks[1].priority, "Done");
assert.deepEqual(view.focus, { total: 2, completed: 1, progress: 50 });
assert.equal(view.projects[0].tasks, 5);
assert.equal(view.projects[0].remaining, 2);
assert.equal(view.projects[0].progress, 60);
assert.equal(view.projects[1].progress, 0);
assert.equal(buildOverview(user, snapshot, [], []).upcoming, null);
assert.equal(buildOverview(user, snapshot, [], []).focus.progress, 0);
await assert.rejects(loadOverview(undefined, async () => new Response("{}", { status: 503 })), (error) => error instanceof OverviewRequestError && error.status === 503);
const abort = new AbortController();
abort.abort();
await assert.rejects(loadOverview(abort.signal, async (_path, options) => { options.signal.throwIfAborted(); }), { name: "AbortError" });

try {
  const fetchFor = (cookie) => async (path, options) => {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    return fetch(base + path, { ...options, headers: cookie ? { Cookie: cookie } : {} });
  };
  await assert.rejects(loadOverview(undefined, fetchFor()), (error) => error instanceof OverviewRequestError && error.status === 401);
  const users = [];
  for (let i = 0; i < 2; i++) {
    const response = await fetch(base + "/api/auth/sign-up/email", {
      method: "POST", headers: { Origin: new URL(base).origin, "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Frontend fixture ${i}`, email: `overview-ui-${randomUUID()}@example.com`, password: randomUUID() + "Aa1!", timezone: "Asia/Bangkok" }),
    });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    userIds.push(data.user.id);
    users.push({ id: data.user.id, cookie: response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ") });
  }
  const owner = users[0];
  const empty = await loadOverview(undefined, fetchFor(owner.cookie));
  assert.equal(empty.user.id, owner.id);
  assert.equal(empty.summary.totalTasks, 0);
  assert.deepEqual(empty.projects, []);
  assert.deepEqual(empty.todayTasks, []);
  const projectId = randomUUID(), archivedId = randomUUID();
  await pool.query('INSERT INTO public.projects ("id", "userId", "name", "color", "archivedAt") VALUES ($1, $3, \'Live project\', \'#ABCDEF\', NULL), ($2, $3, \'Archived project\', \'#245C45\', now())', [projectId, archivedId, owner.id]);
  await pool.query(`INSERT INTO public.tasks ("id", "userId", "projectId", "title", "status", "dueAt", "completedAt") VALUES
    ($1, $4, $5, 'Live unfinished task', 'TODO', now(), NULL),
    ($2, $4, $5, 'Live completed task', 'DONE', now(), now()),
    ($3, $4, $6, 'Hidden archived task', 'TODO', now(), NULL)`, [randomUUID(), randomUUID(), randomUUID(), owner.id, projectId, archivedId]);
  const live = await loadOverview(undefined, fetchFor(owner.cookie));
  assert.equal(live.summary.totalTasks, 2);
  assert.equal(live.summary.todayTasks, 1);
  assert.equal(live.user.name, "Frontend fixture 0");
  assert.equal(live.projects.length, 1);
  assert.equal(live.projects[0].color, "#ABCDEF");
  assert.equal(live.projects[0].progress, 50);
  assert.equal(live.todayTasks.length, 2);
  assert.ok(live.todayTasks.every((row) => row.project === "Live project"));
  assert.equal(live.completedThisWeek, 1);
  assert.equal(live.focus.progress, 50);
  const foreign = await loadOverview(undefined, fetchFor(users[1].cookie));
  assert.equal(foreign.summary.totalTasks, 0);
  assert.deepEqual(foreign.projects, []);
  assert.deepEqual(foreign.todayTasks, []);
  console.log("Overview frontend passed: live four-API loading, owner isolation, empty/archive states, timezone/week boundaries, project/focus progress, 401/503 and cancellation.");
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
    } finally { client.release(); }
  }
  await pool.end();
}
