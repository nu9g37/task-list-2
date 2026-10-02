import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd(), true);
const base = process.env.API_TEST_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const userIds = [];
async function request(path, body, cookie) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { Origin: new URL(base).origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  return { response, data };
}
try {
  for (const initial of ["Asia/Bangkok", undefined]) {
    const signup = await request("/api/auth/sign-up/email", {
      name: "Timezone fixture", email: `timezone-${randomUUID()}@example.com`, password: randomUUID() + "Aa1!", timezone: initial,
    });
    if (signup.data.user?.id) userIds.push(signup.data.user.id);
    assert.equal(signup.response.status, 200, JSON.stringify(signup.data));
    assert.equal(signup.data.user.timezone, initial ?? "UTC");
    const cookie = signup.response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    for (const timezone of ["Asia/Kathmandu", "America/New_York", "UTC"]) {
      const update = await request("/api/auth/update-user", { timezone }, cookie);
      assert.equal(update.response.status, 200, JSON.stringify(update.data));
      const me = await request("/api/me", undefined, cookie);
      assert.equal(me.data.user.timezone, timezone);
      const overview = await request("/api/overview", undefined, cookie);
      assert.equal(overview.data.timezone, timezone);
      const stored = await pool.query('SELECT "timezone" FROM public."user" WHERE "id" = $1', [signup.data.user.id]);
      assert.equal(stored.rows[0].timezone, timezone);
    }
    const invalid = await request("/api/auth/update-user", { timezone: "Invalid/Timezone" }, cookie);
    assert.equal(invalid.response.status, 400);
    assert.equal((await request("/api/me", undefined, cookie)).data.user.timezone, "UTC");
    const nameOnly = await request("/api/auth/update-user", { name: "Updated fixture" }, cookie);
    assert.equal(nameOnly.response.status, 200);
    assert.equal((await request("/api/me", undefined, cookie)).data.user.timezone, "UTC");
  }
  const anonymous = await request("/api/auth/update-user", { timezone: "Asia/Bangkok" });
  assert.equal(anonymous.response.status, 401);
  console.log("Profile timezone API passed: signup/default, updates, database persistence, session/overview refresh, invalid input and authentication.");
} finally {
  if (userIds.length) await pool.query('DELETE FROM public."user" WHERE "id" = ANY($1::text[])', [userIds]);
  await pool.end();
}
