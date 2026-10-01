import { apiError, json, requireUserId } from "@/server/api";
import { getOverview } from "@/server/overview/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    return json(await getOverview(userId));
  } catch (error) {
    return apiError(error);
  }
}
