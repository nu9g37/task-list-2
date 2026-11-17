import { getAuth } from "@/features/auth/lib/auth";
import { apiError, ApiError, json } from "@/lib/api";
import { measure, withServerTiming } from "@/lib/timing";

export const runtime = "nodejs";

async function handleGET(request: Request) {
  try {
    const session = await measure("auth", () =>
      getAuth().api.getSession({ headers: request.headers }),
    );
    if (!session) throw new ApiError(401, "Unauthorized");
    const { user } = session;
    return json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        timezone: user.timezone ?? "UTC",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export const GET = withServerTiming(handleGET);
