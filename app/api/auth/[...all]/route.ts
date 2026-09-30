import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { ConfigurationError } from "@/lib/env";

export const runtime = "nodejs";

async function handle(request: Request, method: "GET" | "POST") {
  try {
    const handler = toNextJsHandler(getAuth());
    return await handler[method](request);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return Response.json(
        { error: "Configure the backend environment in .env.local." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }
}

export function GET(request: Request) {
  return handle(request, "GET");
}

export function POST(request: Request) {
  return handle(request, "POST");
}
