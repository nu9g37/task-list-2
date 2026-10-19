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
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    globalForDb.tasklistPool.on("error", () => {
      console.error("An idle PostgreSQL connection failed.");
    });
  }
  return globalForDb.tasklistPool;
}
