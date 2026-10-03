import { getWorkspace } from "@/server/workspace/service";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { ApiError } from "@/server/api";
import { OverviewScreen } from "@/components/overview/overview-screen";

export const metadata: Metadata = { title: "Project · Tasklist 2" };

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const { id } = await params;
  let initialData;
  try {
    initialData = await getWorkspace(
      {
        ...session.user,
        image: session.user.image ?? null,
        timezone: session.user.timezone ?? "UTC",
      },
      id,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <OverviewScreen
      key={id + initialData.asOf}
      projectId={id}
      initialData={initialData}
    />
  );
}
