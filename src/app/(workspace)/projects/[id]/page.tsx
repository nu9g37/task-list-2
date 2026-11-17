import { requireWorkspace } from "@/features/workspace/server/request";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { OverviewScreen } from "@/features/overview/components/overview-screen";

export const metadata: Metadata = { title: "Project · Tasklist 2" };

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let initialData;
  try {
    initialData = await requireWorkspace(id);
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
