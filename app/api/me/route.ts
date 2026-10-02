import { getAuth } from "@/lib/auth";
import { ConfigurationError } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    }
    const { user } = session;
    return Response.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image ?? null,
          timezone: user.timezone ?? "UTC",
        },
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return Response.json(
        { error: "Configure the backend environment in .env.local." },
        { status: 503, headers },
      );
    }
    throw error;
  }
}
