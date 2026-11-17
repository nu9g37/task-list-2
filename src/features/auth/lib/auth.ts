import "server-only";

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { getDb } from "@/server/db";
import { requireEnv } from "@/lib/env";
import { timezoneValidator } from "@/lib/timezone";
import {
  sanitizeUserCreate,
  sanitizeUserUpdate,
  UserValidationError,
} from "./user-validation";

function validateUserHook<T>(validate: () => T): T {
  try {
    return validate();
  } catch (error) {
    if (error instanceof UserValidationError) {
      throw new APIError("BAD_REQUEST", { message: error.message });
    }
    throw error;
  }
}

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
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            return validateUserHook(() => ({
              data: sanitizeUserCreate(user),
            }));
          },
        },
        update: {
          async before(user) {
            return validateUserHook(() => {
              const data = sanitizeUserUpdate(user);
              return data ? { data } : undefined;
            });
          },
        },
      },
    },
    user: {
      additionalFields: {
        timezone: {
          type: "string",
          required: false,
          defaultValue: "UTC",
          input: true,
          validator: { input: timezoneValidator },
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
