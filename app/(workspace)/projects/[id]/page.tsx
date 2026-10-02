import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getProject } from "@/server/projects/service";
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
  try {
    const project = await getProject(session.user.id, id);
    if (project.archivedAt) notFound();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return <OverviewScreen key={id} projectId={id} />;
}
