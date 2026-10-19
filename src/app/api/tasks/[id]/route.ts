import { withServerTiming } from "@/lib/timing";
import {
  apiError,
  json,
  readJsonObject,
  requireAppOrigin,
  requireUserId,
} from "@/lib/api";
import { deleteTask, getTask, updateTask } from "@/features/tasks/server/service";
import { parseTaskInput } from "@/features/tasks/server/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

async function handleGET(request: Request, context: Context) {
  try {
    const userId = await requireUserId(request);
    const { id } = await context.params;
    return json({ task: await getTask(userId, id) });
  } catch (error) {
    return apiError(error);
  }
}

async function handlePATCH(request: Request, context: Context) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    const { id } = await context.params;
    return json({
      task: await updateTask(
        userId,
        id,
        parseTaskInput(await readJsonObject(request), true),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}

async function handleDELETE(request: Request, context: Context) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    const { id } = await context.params;
    await deleteTask(userId, id);
    return json({ message: "Task deleted successfully" });
  } catch (error) {
    return apiError(error);
  }
}

export const GET = withServerTiming(handleGET);
export const PATCH = withServerTiming(handlePATCH);
export const DELETE = withServerTiming(handleDELETE);
