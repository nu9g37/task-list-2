import { apiError, json, readJsonObject, requireAppOrigin, requireUserId } from "@/server/api";
import { createTask, listTasks } from "@/server/tasks/service";
import { parseTaskFilters, parseTaskInput } from "@/server/tasks/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    return json({ tasks: await listTasks(userId, parseTaskFilters(request)) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    return json({ task: await createTask(userId, parseTaskInput(await readJsonObject(request))) }, 201);
  } catch (error) {
    return apiError(error);
  }
}
