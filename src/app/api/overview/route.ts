import { apiError, json, requireUserId } from "@/lib/api";
import { getOverview } from "@/features/overview/server/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    return json(await getOverview(userId));
  } catch (error) {
    return apiError(error);
  }
}
