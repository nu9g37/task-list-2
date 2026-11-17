import type { ReactNode } from "react";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { getOptionalWorkspace } from "@/features/workspace/server/request";

export default async function Layout({ children }: { children: ReactNode }) {
  const workspace = await getOptionalWorkspace();
  return (
    <WorkspaceLayout
      initialUser={workspace?.user}
      initialProjects={workspace?.projects}
    >
      {children}
    </WorkspaceLayout>
  );
}
