import {
  apiError,
  json,
  readJsonObject,
  requireAppOrigin,
  requireUserId,
} from "@/server/api";
import {
  deleteProject,
  getProject,
  updateProject,
} from "@/server/projects/service";
import { parseProjectInput } from "@/server/projects/validation";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const userId = await requireUserId(request);
    const { id } = await context.params;
    return json({ project: await getProject(userId, id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    const { id } = await context.params;
    const input = parseProjectInput(await readJsonObject(request), true);
    return json({ project: await updateProject(userId, id, input) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    const { id } = await context.params;
    await deleteProject(userId, id);
    return json({ message: "Project deleted successfully" });
  } catch (error) {
    return apiError(error);
  }
}
