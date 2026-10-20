import { withServerTiming } from "@/lib/timing";
import {
  apiError,
  json,
  readJsonObject,
  requireAppOrigin,
  requireUserId,
} from "@/lib/api";
import {
  createProject,
  listProjects,
} from "@/features/projects/server/service";
import {
  parseArchiveFilter,
  parseProjectInput,
} from "@/features/projects/server/validation";

export const runtime = "nodejs";

async function handleGET(request: Request) {
  try {
    const userId = await requireUserId(request);
    const projects = await listProjects(userId, parseArchiveFilter(request));
    return json({ projects });
  } catch (error) {
    return apiError(error);
  }
}

async function handlePOST(request: Request) {
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

export const GET = withServerTiming(handleGET);
export const POST = withServerTiming(handlePOST);
