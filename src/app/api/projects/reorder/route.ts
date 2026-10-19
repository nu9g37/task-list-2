import { withServerTiming } from "@/lib/timing";
import {
  apiError,
  json,
  readJsonObject,
  requireAppOrigin,
  requireUserId,
} from "@/lib/api";
import { reorderProjects } from "@/features/projects/server/service";
import { parseProjectOrder } from "@/features/projects/server/validation";

export const runtime = "nodejs";

async function handlePATCH(request: Request) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    await reorderProjects(
      userId,
      parseProjectOrder(await readJsonObject(request)),
    );
    return json({ message: "Project order saved" });
  } catch (error) {
    return apiError(error);
  }
}

export const PATCH = withServerTiming(handlePATCH);
