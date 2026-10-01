import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd(), true);
const base = process.env.API_TEST_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const userIds = [];
let checks = 0;

async function request(path, { method = "GET", cookie, body, raw, origin = new URL(base).origin, contentType = "application/json" } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined || raw !== undefined ? { "Content-Type": contentType } : {}),
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return { response, data: await response.json() };
}

function status(result, expected) {
  assert.equal(result.response.status, expected, JSON.stringify(result.data));
  assert.equal(result.response.headers.get("cache-control"), "no-store");
  checks++;
  return result.data;
}

async function signUp() {
  const result = await request("/api/auth/sign-up/email", {
    method: "POST", body: { name: "Task API fixture", email: `task-api-${randomUUID()}@example.com`, password: randomUUID() + "Aa1!" },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  userIds.push(result.data.user.id);
  const cookie = result.response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.ok(cookie);
  return { id: result.data.user.id, cookie };
}

try {
  const owner = await signUp();
  const other = await signUp();
  const create = async (body, user = owner) => status(await request("/api/tasks", { method: "POST", cookie: user.cookie, body }), 201).task;
  const patch = async (id, body) => status(await request(`/api/tasks/${id}`, { method: "PATCH", cookie: owner.cookie, body }), 200).task;
  const list = async (query = "") => status(await request(`/api/tasks${query}`, { cookie: owner.cookie }), 200).tasks;
  const project = status(await request("/api/projects", { method: "POST", cookie: owner.cookie, body: { name: "Task fixture" } }), 201).project;
  const foreignProject = status(await request("/api/projects", { method: "POST", cookie: other.cookie, body: { name: "Foreign fixture" } }), 201).project;
  for (const [path, method] of [["/api/tasks", "GET"], ["/api/tasks", "POST"], ["/api/tasks/missing", "GET"], ["/api/tasks/missing", "PATCH"], ["/api/tasks/missing", "DELETE"]]) {
    status(await request(path, { method, body: method === "POST" || method === "PATCH" ? { title: "Unauthorized" } : undefined }), 401);
  }
  const personal = await create({ title: "  Personal task  ", description: "  Notes  " });
  assert.equal(personal.userId, owner.id);
  assert.equal(personal.title, "Personal task");
  assert.equal(personal.description, "Notes");
  assert.equal(personal.projectId, null);
  assert.equal(personal.status, "TODO");
  assert.equal(personal.priority, "MEDIUM");
  assert.equal(personal.dueAt, null);
  assert.equal(personal.completedAt, null);
  assert.equal(personal.position, 0);
  const task = await create({ title: "Project task", projectId: project.id, priority: "HIGH", dueAt: "2026-10-01T09:00:00+07:00" });
  assert.equal(task.dueAt, "2026-10-01T02:00:00.000Z");
  assert.equal(task.position, 0);
  const detail = status(await request(`/api/tasks/${task.id}`, { cookie: owner.cookie }), 200).task;
  assert.equal(detail.id, task.id);
  for (const method of ["GET", "PATCH", "DELETE"]) {
    status(await request(`/api/tasks/${task.id}`, { method, cookie: other.cookie, body: method === "PATCH" ? { title: "Stolen" } : undefined }), 404);
    status(await request(`/api/tasks/${randomUUID()}`, { method, cookie: owner.cookie, body: method === "PATCH" ? { title: "Missing" } : undefined }), 404);
  }
  assert.deepEqual(status(await request("/api/tasks?archived=all", { cookie: other.cookie }), 200).tasks, []);
  for (const body of [{}, { title: " " }, { title: "x".repeat(201) }, { title: "Valid", projectId: "" }, { title: "Valid", status: "INVALID" }, { title: "Valid", priority: null }, { title: "Valid", position: -1 }, { title: "Valid", position: 2147483648 }, { title: "Valid", description: 123 }, { title: "Valid", userId: other.id }, { title: "Valid", completedAt: "2026-10-01T00:00:00Z" }, [], null]) {
    status(await request("/api/tasks", { method: "POST", cookie: owner.cookie, body }), 400);
  }
  for (const dueAt of ["2026-02-30T12:00:00Z", "2026-02-29T12:00:00Z", "2026-13-01T12:00:00Z", "2026-10-01", "2026-10-01T12:00:00", "2026-10-01T24:00:00Z", "2026-10-01T12:60:00Z", "2026-10-01T12:00:00+24:00", 123]) {
    status(await request("/api/tasks", { method: "POST", cookie: owner.cookie, body: { title: "Invalid deadline", dueAt } }), 400);
  }
  status(await request("/api/tasks", { method: "POST", cookie: owner.cookie, raw: "{" }), 400);
  status(await request("/api/tasks", { method: "POST", cookie: owner.cookie, body: { title: "Wrong content type" }, contentType: "text/plain" }), 415);
  for (const method of ["POST", "PATCH", "DELETE"]) {
    status(await request(method === "POST" ? "/api/tasks" : `/api/tasks/${task.id}`, { method, cookie: owner.cookie, body: method === "DELETE" ? undefined : { title: "Bad origin" }, origin: "https://example.org" }), 403);
  }
  for (const body of [{}, { title: null }, { dueAt: "not a date" }, { completedAt: null }, { id: randomUUID() }]) {
    status(await request(`/api/tasks/${task.id}`, { method: "PATCH", cookie: owner.cookie, body }), 400);
  }
  for (const projectId of [foreignProject.id, randomUUID()]) {
    status(await request("/api/tasks", { method: "POST", cookie: owner.cookie, body: { title: "Invalid project", projectId } }), 404);
    status(await request(`/api/tasks/${personal.id}`, { method: "PATCH", cookie: owner.cookie, body: { projectId, title: "Must roll back" } }), 404);
  }
  assert.equal(status(await request(`/api/tasks/${personal.id}`, { cookie: owner.cookie }), 200).task.title, "Personal task");
  const done = await patch(task.id, { status: "DONE" });
  assert.ok(done.completedAt);
  assert.equal((await patch(task.id, { title: "Renamed", status: "DONE" })).completedAt, done.completedAt);
  const reopened = await patch(task.id, { status: "TODO" });
  assert.equal(reopened.completedAt, null);
  status(await request(`/api/tasks/${task.id}`, { method: "PATCH", cookie: owner.cookie, body: { status: "IN_PROGRESS" } }), 400);
  status(await request("/api/tasks", { method: "POST", cookie: owner.cookie, body: { title: "Removed status", status: "IN_PROGRESS" } }), 400);
  status(await request("/api/tasks?status=IN_PROGRESS", { cookie: owner.cookie }), 400);
  const bornDone = await create({ title: "Already completed", status: "DONE", dueAt: "2028-02-29T12:00:00Z" });
  assert.ok(bornDone.completedAt);
  const clean = await patch(bornDone.id, { status: "TODO", dueAt: null, description: null });
  assert.equal(clean.completedAt, null);
  assert.equal(clean.dueAt, null);
  assert.equal(clean.description, null);
  assert.deepEqual((await list(`?projectId=${project.id}&status=TODO&priority=HIGH`)).map((row) => row.id), [task.id]);
  assert.ok((await list("?projectId=null")).every((row) => row.projectId === null));
  assert.deepEqual(await list(`?projectId=${foreignProject.id}`), []);
  const start = "2026-10-01T02:00:00Z", end = "2026-10-02T02:00:00Z";
  const boundary = await create({ title: "End boundary", projectId: project.id, dueAt: end });
  const range = "?" + new URLSearchParams({ dueFrom: start, dueTo: end });
  assert.deepEqual((await list(range)).map((row) => row.id), [task.id]);
  for (const query of ["?status=INVALID", "?priority=INVALID", "?archived=INVALID", "?projectId=", "?dueFrom=2026-10-01", "?dueFrom=2026-10-02T00:00:00Z&dueTo=2026-10-01T00:00:00Z"]) {
    status(await request(`/api/tasks${query}`, { cookie: owner.cookie }), 400);
  }
  const moved = await patch(personal.id, { projectId: project.id });
  assert.equal(moved.position, boundary.position + 1);
  const detached = await patch(personal.id, { projectId: null, position: 12 });
  assert.equal(detached.projectId, null);
  assert.equal(detached.position, 12);
  const concurrent = await Promise.all(["First append", "Second append"].map((title) => create({ title, projectId: project.id })));
  assert.notEqual(concurrent[0].position, concurrent[1].position);
  status(await request(`/api/projects/${project.id}`, { method: "PATCH", cookie: owner.cookie, body: { archived: true } }), 200);
  assert.ok((await list()).every((row) => row.projectId !== project.id));
  assert.ok((await list("?archived=true")).every((row) => row.projectId === project.id));
  assert.equal((await list("?archived=true")).length, 4);
  assert.equal((await list("?archived=all")).length, 6);
  status(await request("/api/tasks", { method: "POST", cookie: owner.cookie, body: { title: "Archived target", projectId: project.id } }), 409);
  status(await request(`/api/tasks/${personal.id}`, { method: "PATCH", cookie: owner.cookie, body: { projectId: project.id } }), 409);
  assert.equal((await patch(task.id, { priority: "LOW" })).priority, "LOW");
  const archivedDetached = await patch(task.id, { projectId: null });
  assert.equal(archivedDetached.projectId, null);
  assert.equal(archivedDetached.position, 13);
  status(await request(`/api/projects/${project.id}`, { method: "DELETE", cookie: owner.cookie }), 409);
  for (const row of await list("?archived=all")) {
    const deleted = status(await request(`/api/tasks/${row.id}`, { method: "DELETE", cookie: owner.cookie }), 200);
    assert.deepEqual(deleted, { message: "Task deleted successfully" });
  }
  status(await request(`/api/tasks/${task.id}`, { cookie: owner.cookie }), 404);
  status(await request(`/api/tasks/${task.id}`, { method: "DELETE", cookie: owner.cookie }), 404);
  assert.deepEqual(await list("?archived=all"), []);
  status(await request(`/api/projects/${project.id}`, { method: "DELETE", cookie: owner.cookie }), 200);
  console.log(`Task API integration passed: ${checks} HTTP checks; CRUD, ownership, validation, deadline boundaries/timezones, completion, project moves/archive, concurrent appends and deletion protection.`);
} finally {
  // Only remove the exact fixture users created by this run, never existing user data.
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
