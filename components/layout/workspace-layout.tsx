"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";
import { ProjectForm } from "@/components/projects/project-form";
import type { OverviewData, OverviewProject, OverviewUser } from "@/components/overview/overview-data";

const WorkspaceContext = createContext<{ revision: number; publish: (data: OverviewData) => void; search: string; setSearch: (value: string) => void } | null>(null);

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("Workspace layout is required");
  return workspace;
}

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [searches, setSearches] = useState<Record<string, string>>({});
  const search = searches[pathname] ?? "";
  const setSearch = (value: string) => setSearches((previous) => ({ ...previous, [pathname]: value }));
  const activeProjectId = pathname.startsWith("/projects/") ? decodeURIComponent(pathname.split("/")[2]) : undefined;
  const [sidebar, setSidebar] = useState<{ user?: OverviewUser; projects: OverviewProject[] }>({ projects: [] });
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const publish = useCallback((data: OverviewData) => setSidebar({ user: data.user, projects: data.projects }), []);
  const title = pathname === "/calendar" ? "Calendar" : activeProjectId ? sidebar.projects.find((project) => project.id === activeProjectId)?.name ?? "Project" : "Overview";

  return <WorkspaceContext.Provider value={{ revision, publish, search, setSearch }}>
    <AppShell pageTitle={title} activeProjectId={activeProjectId} user={sidebar.user} projects={sidebar.projects} onAddProject={() => setProjectFormOpen(true)}>
      {children}
      {projectFormOpen && <ProjectForm onClose={() => setProjectFormOpen(false)} onCreated={() => setRevision((value) => value + 1)} />}
    </AppShell>
  </WorkspaceContext.Provider>;
}
