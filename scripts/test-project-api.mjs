import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd(), true);
const base =
  process.env.API_TEST_URL ??
  process.env.BETTER_AUTH_URL ??
  "http://localhost:3000";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
const userIds = [];
let checks = 0;

async function request(
  path,
  { method = "GET", cookie, body, raw, origin = base } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined || raw !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const data = response.status === 204 ? null : await response.json();
  return { response, data };
}

function status(result, expected) {
  assert.equal(result.response.status, expected, JSON.stringify(result.data));
  checks++;
}

async function signUp() {
  const result = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: {
      name: "Project API fixture",
      email: `project-api-${randomUUID()}@example.com`,
      password: randomUUID() + "Aa1!",
    },
  });
  status(result, 200);
  userIds.push(result.data.user.id);
  const cookie = result.response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(cookie, "Sign-up must set a session cookie");
  return { id: result.data.user.id, cookie };
}

try {
  const owner = await signUp();
  const other = await signUp();
  for (const [path, method] of [
    ["/api/projects", "GET"],
    ["/api/projects", "POST"],
    ["/api/projects/missing", "GET"],
    ["/api/projects/missing", "PATCH"],
    ["/api/projects/missing", "DELETE"],
  ]) {
    status(
      await request(path, {
        method,
        body:
          method === "POST" || method === "PATCH"
            ? { name: "Unauthorized" }
            : undefined,
      }),
      401,
    );
  }
  const created = await request("/api/projects", {
    method: "POST",
    cookie: owner.cookie,
    body: {
      name: "  Website redesign  ",
      color: "#abcdef",
      description: "  test  ",
    },
  });
  status(created, 201);
  const project = created.data.project;
  assert.equal(project.userId, owner.id);
  assert.equal(project.name, "Website redesign");
  assert.equal(project.color, "#ABCDEF");
  assert.equal(project.description, "test");
  assert.equal(project.archivedAt, null);
  status(
    await request(`/api/projects/${project.id}`, { cookie: owner.cookie }),
    200,
  );
  const list = await request("/api/projects", { cookie: owner.cookie });
  status(list, 200);
  assert.ok(list.data.projects.some((row) => row.id === project.id));
  const otherList = await request("/api/projects?archived=all", {
    cookie: other.cookie,
  });
  status(otherList, 200);
  assert.ok(!otherList.data.projects.some((row) => row.id === project.id));
  for (const method of ["GET", "PATCH", "DELETE"]) {
    status(
      await request(`/api/projects/${project.id}`, {
        method,
        cookie: other.cookie,
        body: method === "PATCH" ? { name: "Stolen" } : undefined,
      }),
      404,
    );
    status(
      await request(`/api/projects/${randomUUID()}`, {
        method,
        cookie: owner.cookie,
        body: method === "PATCH" ? { name: "Missing" } : undefined,
      }),
      404,
    );
  }
  for (const body of [
    {},
    { name: " " },
    { name: "Valid", color: "red" },
    { name: "Valid", position: -1 },
    { name: "Valid", position: 2147483648 },
    { name: "Valid", userId: other.id },
    [],
    null,
  ]) {
    status(
      await request("/api/projects", {
        method: "POST",
        cookie: owner.cookie,
        body,
      }),
      400,
    );
  }
  status(
    await request("/api/projects", {
      method: "POST",
      cookie: owner.cookie,
      raw: "{",
    }),
    400,
  );
  status(
    await request("/api/projects", {
      method: "POST",
      cookie: owner.cookie,
      body: { name: "Cross origin" },
      origin: "https://example.org",
    }),
    403,
  );
  status(
    await request("/api/projects?archived=invalid", { cookie: owner.cookie }),
    400,
  );
  for (const body of [
    {},
    { archived: "true" },
    { archivedAt: null },
    { description: 123 },
    { name: null },
  ]) {
    status(
      await request(`/api/projects/${project.id}`, {
        method: "PATCH",
        cookie: owner.cookie,
        body,
      }),
      400,
    );
  }
  const archived = await request(`/api/projects/${project.id}`, {
    method: "PATCH",
    cookie: owner.cookie,
    body: { archived: true, description: null, position: 2 },
  });
  status(archived, 200);
  assert.ok(archived.data.project.archivedAt);
  assert.equal(archived.data.project.description, null);
  const active = await request("/api/projects", { cookie: owner.cookie });
  status(active, 200);
  assert.ok(!active.data.projects.some((row) => row.id === project.id));
  const archivedList = await request("/api/projects?archived=true", {
    cookie: owner.cookie,
  });
  status(archivedList, 200);
  assert.ok(archivedList.data.projects.some((row) => row.id === project.id));
  const restored = await request(`/api/projects/${project.id}`, {
    method: "PATCH",
    cookie: owner.cookie,
    body: { archived: false },
  });
  status(restored, 200);
  assert.equal(restored.data.project.archivedAt, null);
  const concurrent = await Promise.all(
    ["First append", "Second append"].map((name) =>
      request("/api/projects", {
        method: "POST",
        cookie: owner.cookie,
        body: { name },
      }),
    ),
  );
  concurrent.forEach((result) => status(result, 201));
  assert.notEqual(
    concurrent[0].data.project.position,
    concurrent[1].data.project.position,
  );
  const taskId = randomUUID();
  await pool.query(
    'INSERT INTO public.tasks ("id", "userId", "projectId", "title") VALUES ($1, $2, $3, $4)',
    [taskId, owner.id, project.id, "Deletion blocker fixture"],
  );
  status(
    await request(`/api/projects/${project.id}`, {
      method: "DELETE",
      cookie: owner.cookie,
    }),
    409,
  );
  const preserved = await pool.query(
    'SELECT "id" FROM public.tasks WHERE "id" = $1 AND "userId" = $2',
    [taskId, owner.id],
  );
  assert.equal(preserved.rowCount, 1);
  await pool.query(
    'DELETE FROM public.tasks WHERE "id" = $1 AND "userId" = $2',
    [taskId, owner.id],
  );
  const deleted = await request(`/api/projects/${project.id}`, {
    method: "DELETE",
    cookie: owner.cookie,
  });
  status(deleted, 200);
  assert.deepEqual(deleted.data, { message: "Project deleted successfully" });
  status(
    await request(`/api/projects/${project.id}`, { cookie: owner.cookie }),
    404,
  );
  console.log(
    `Project API integration passed: ${checks} HTTP checks, ownership isolation, archive/restore, concurrent ordering and deletion protection.`,
  );
} finally {
  // Only delete the exact fixture users created by this run and their data.
  if (userIds.length) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        'DELETE FROM public.tasks WHERE "userId" = ANY($1::text[])',
        [userIds],
      );
      await client.query(
        'DELETE FROM public.projects WHERE "userId" = ANY($1::text[])',
        [userIds],
      );
      await client.query(
        'DELETE FROM public."user" WHERE "id" = ANY($1::text[])',
        [userIds],
      );
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
