import { getDb } from "@/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getDb().query("SELECT 1");
    return Response.json(
      { status: "ok", database: "connected" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
