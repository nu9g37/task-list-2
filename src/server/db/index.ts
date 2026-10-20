import "server-only";

import { Pool } from "pg";
import { requireEnv } from "@/lib/env";

const globalForDb = globalThis as typeof globalThis & {
  tasklistPool?: Pool;
};

/** Lazily connect so builds do not require a running local database. */
export function getDb(): Pool {
  if (!globalForDb.tasklistPool) {
    globalForDb.tasklistPool = new Pool({
      connectionString: requireEnv("DATABASE_URL"),
      // Serverless: each instance handles few concurrent queries, and Neon's
      // pooler (PgBouncer) multiplexes connections, so keep this small.
      max: process.env.VERCEL ? 2 : 5,
      // Allow for a Neon free-tier cold start (compute resuming from suspend).
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
    });
    globalForDb.tasklistPool.on("error", () => {
      console.error("An idle PostgreSQL connection failed.");
    });
  }
  return globalForDb.tasklistPool;
}
