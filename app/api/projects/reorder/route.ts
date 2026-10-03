import { withServerTiming } from "@/server/timing";
import {
  apiError,
  json,
  readJsonObject,
  requireAppOrigin,
  requireUserId,
} from "@/server/api";
import { reorderProjects } from "@/server/projects/service";
import { parseProjectOrder } from "@/server/projects/validation";

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
