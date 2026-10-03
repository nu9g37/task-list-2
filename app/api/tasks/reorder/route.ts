import {
  apiError,
  json,
  readJsonObject,
  requireAppOrigin,
  requireUserId,
} from "@/server/api";
import { reorderTasks } from "@/server/tasks/service";
import { parseTaskOrder } from "@/server/tasks/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    const order = parseTaskOrder(await readJsonObject(request));
    await reorderTasks(userId, order.taskIds, order.projectId);
    return json({ message: "Task order saved" });
  } catch (error) {
    return apiError(error);
  }
}
