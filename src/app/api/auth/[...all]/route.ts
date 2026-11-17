import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/features/auth/lib/auth";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

async function handle(request: Request, method: "GET" | "POST") {
  try {
    const handler = toNextJsHandler(getAuth());
    return await handler[method](request);
  } catch (error) {
    return apiError(error);
  }
}

export function GET(request: Request) {
  return handle(request, "GET");
}

export function POST(request: Request) {
  return handle(request, "POST");
}
