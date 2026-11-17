import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/features/auth/lib/auth";
import type { OverviewUser } from "@/features/overview/data";
import { assembleWorkspace, fetchWorkspaceRecords } from "./service";

const getWorkspaceSession = cache(async () =>
  getAuth().api.getSession({ headers: await headers() }),
);

const loadCachedWorkspaceRecords = cache((userId: string) =>
  fetchWorkspaceRecords(userId),
);

async function buildWorkspaceFromSession(
  session: NonNullable<Awaited<ReturnType<typeof getWorkspaceSession>>>,
  projectId?: string,
) {
  const user: OverviewUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    timezone: session.user.timezone ?? "UTC",
  };
  const records = await loadCachedWorkspaceRecords(user.id);
  return assembleWorkspace(user, records, projectId);
}

export async function getOptionalWorkspace() {
  const session = await getWorkspaceSession();
  return session ? buildWorkspaceFromSession(session) : null;
}

export async function requireWorkspace(projectId?: string) {
  const session = await getWorkspaceSession();
  if (!session) redirect("/sign-in");
  return buildWorkspaceFromSession(session, projectId);
}
