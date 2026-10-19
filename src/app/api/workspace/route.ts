import { withServerTiming } from "@/lib/timing";
import { getAuth } from "@/features/auth/lib/auth";
import { apiError, ApiError, json } from "@/lib/api";
import { getWorkspace } from "@/features/workspace/server/service";
import { measure } from "@/lib/timing";

export const runtime = "nodejs";

async function handleGET(request: Request) {
  try {
    const session = await measure("auth", () =>
      getAuth().api.getSession({ headers: request.headers }),
    );
    if (!session) throw new ApiError(401, "Unauthorized");
    const projectId =
      new URL(request.url).searchParams.get("projectId") ?? undefined;
    const data = await getWorkspace(
      {
        ...session.user,
        image: session.user.image ?? null,
        timezone: session.user.timezone ?? "UTC",
      },
      projectId,
    );
    const response = json(data);
    return response;
  } catch (error) {
    return apiError(error);
  }
}

export const GET = withServerTiming(handleGET);
