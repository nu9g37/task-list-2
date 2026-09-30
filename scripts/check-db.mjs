import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;

loadEnvConfig(process.cwd(), true);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || /YOUR_|CHANGE_ME/.test(url)) {
    throw new Error("CONFIGURATION_MISSING");
  }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
  try {
    const required = {
      user: ["id", "name", "email", "emailVerified", "image", "timezone", "createdAt", "updatedAt"],
      session: ["id", "userId", "token", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt"],
      account: ["id", "userId", "accountId", "providerId", "password", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "createdAt", "updatedAt"],
      verification: ["id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"],
      projects: ["id", "userId", "name", "description", "color", "position", "archivedAt", "createdAt", "updatedAt"],
      tasks: ["id", "userId", "projectId", "title", "description", "status", "priority", "dueAt", "completedAt", "position", "createdAt", "updatedAt"],
    };
    const { rows } = await pool.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
      [Object.keys(required)],
    );
    const missing = [];
    for (const [table, columns] of Object.entries(required)) {
      for (const column of columns) {
        if (!rows.some((row) => row.table_name === table && row.column_name === column)) {
          missing.push(`${table}.${column}`);
        }
      }
    }
    if (missing.length) {
      console.error("Missing schema columns:", missing.join(", "));
      process.exitCode = 1;
      return;
    }
    console.log("PostgreSQL connected. All six tables have the expected columns.");
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error("Database check failed. Check DATABASE_URL, PostgreSQL and the initial migration.");
  process.exitCode = 1;
});
