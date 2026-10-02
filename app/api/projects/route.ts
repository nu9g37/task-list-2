import {
  apiError,
  json,
  readJsonObject,
  requireAppOrigin,
  requireUserId,
} from "@/server/api";
import { createProject, listProjects } from "@/server/projects/service";
import {
  parseArchiveFilter,
  parseProjectInput,
} from "@/server/projects/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const projects = await listProjects(userId, parseArchiveFilter(request));
    return json({ projects });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    requireAppOrigin(request);
    const input = parseProjectInput(await readJsonObject(request));
    const project = await createProject(userId, input);
    return json({ project }, 201);
  } catch (error) {
    return apiError(error);
  }
}
