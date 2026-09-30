import "server-only";

import { betterAuth } from "better-auth";
import { getDb } from "@/db";
import { requireEnv } from "./env";

function createAuth() {
  return betterAuth({
    appName: "Tasklist 2",
    database: getDb(),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    baseURL: requireEnv("BETTER_AUTH_URL"),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        timezone: {
          type: "string",
          required: false,
          defaultValue: "UTC",
        },
      },
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

/** Initialize Auth on the first request rather than during the build. */
export function getAuth() {
  auth ??= createAuth();
  return auth;
}
