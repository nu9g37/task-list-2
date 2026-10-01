import "server-only";

import { getAuth } from "@/lib/auth";
import { ConfigurationError, requireEnv } from "@/lib/env";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUserId(request: Request): Promise<string> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new ApiError(401, "Unauthorized");
  return session.user.id;
}

/** Cookie-authenticated mutations must originate from the configured app. */
export function requireAppOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin !== new URL(requireEnv("BETTER_AUTH_URL")).origin) {
    throw new ApiError(403, "Invalid request origin");
  }
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApiError(415, "Content-Type must be application/json");
  }
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Body must be a JSON object");
  }
  return value as Record<string, unknown>;
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(error: unknown): Response {
  if (error instanceof ApiError) return json({ error: error.message }, error.status);
  if (error instanceof ConfigurationError) return json({ error: "Backend configuration unavailable" }, 503);
  console.error("API request failed.", {
    type: error instanceof Error ? error.name : typeof error,
    code: typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined,
  });
  return json({ error: "Internal server error" }, 500);
}
