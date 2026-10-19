import { withServerTiming } from "@/lib/timing";
import {
  apiError,
  json,
  readJsonObject,
  requireAppOrigin,
  requireUserId,
} from "@/lib/api";
import { reorderTasks } from "@/features/tasks/server/service";
import { parseTaskOrder } from "@/features/tasks/server/validation";

export const runtime = "nodejs";

async function handlePATCH(request: Request) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    const order = parseTaskOrder(await readJsonObject(request));
    const positions = await reorderTasks(
      userId,
      order.taskIds,
      order.projectId,
    );
    return json({ message: "Task order saved", positions });
  } catch (error) {
    return apiError(error);
  }
}

export const PATCH = withServerTiming(handlePATCH);
