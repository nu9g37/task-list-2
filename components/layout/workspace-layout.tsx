"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "./app-shell";
import { ProjectForm } from "@/components/projects/project-form";
import { ProfileForm } from "@/components/profile/profile-form";
import type {
  OverviewData,
  OverviewProject,
  OverviewUser,
} from "@/components/overview/overview-data";

const WorkspaceContext = createContext<{
  revision: number;
  publish: (data: OverviewData) => void;
  search: string;
  setSearch: (value: string) => void;
  projectChanged: (deletedId?: string) => void;
  reorderProjects: (ids: string[]) => Promise<void>;
  reordering: boolean;
} | null>(null);

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("Workspace layout is required");
  return workspace;
}

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searches, setSearches] = useState<Record<string, string>>({});
  const search = searches[pathname] ?? "";
  const setSearch = (value: string) =>
    setSearches((previous) => ({ ...previous, [pathname]: value }));
  const activeProjectId = pathname.startsWith("/projects/")
    ? decodeURIComponent(pathname.split("/")[2])
    : undefined;
  const [sidebar, setSidebar] = useState<{
    user?: OverviewUser;
    projects: OverviewProject[];
  }>({ projects: [] });
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [reordering, setReordering] = useState(false);
  const savingOrder = useRef(false);
  const publish = useCallback((data: OverviewData) => {
    if (!savingOrder.current)
      setSidebar({ user: data.user, projects: data.projects });
  }, []);
  const title =
    pathname === "/calendar"
      ? "Calendar"
      : activeProjectId
        ? (sidebar.projects.find((project) => project.id === activeProjectId)
            ?.name ?? "Project")
        : "Overview";

  function projectChanged(deletedId?: string) {
    if (deletedId) {
      setSidebar((previous) => ({
        ...previous,
        projects: previous.projects.filter(
          (project) => project.id !== deletedId,
        ),
      }));
      if (activeProjectId === deletedId) router.replace("/");
    }
    setRevision((value) => value + 1);
  }

  async function reorderProjects(ids: string[]) {
    if (savingOrder.current) return;
    const previous = sidebar.projects;
    savingOrder.current = true;
    setReordering(true);
    setSidebar((value) => ({
      ...value,
      projects: ids.map((id, position) => ({
        ...previous.find((project) => project.id === id)!,
        position,
      })),
    }));
    try {
      const response = await fetch("/api/projects/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: ids }),
      });
      if (!response.ok)
        throw new Error("Unable to save project order. Please try again.");
    } catch (error) {
      setSidebar((value) => ({ ...value, projects: previous }));
      throw error;
    } finally {
      savingOrder.current = false;
      setReordering(false);
      setRevision((value) => value + 1);
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        revision,
        publish,
        search,
        setSearch,
        projectChanged,
        reorderProjects,
        reordering,
      }}
    >
      <AppShell
        pageTitle={title}
        activeProjectId={activeProjectId}
        user={sidebar.user}
        projects={sidebar.projects}
        onAddProject={() => setProjectFormOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
      >
        {children}
        {projectFormOpen && (
          <ProjectForm
            onClose={() => setProjectFormOpen(false)}
            onCreated={() => setRevision((value) => value + 1)}
          />
        )}
        {profileOpen && sidebar.user && (
          <ProfileForm
            user={sidebar.user}
            onClose={() => setProfileOpen(false)}
            onSaved={(user) => {
              setSidebar((previous) => ({ ...previous, user }));
              setRevision((value) => value + 1);
            }}
          />
        )}
      </AppShell>
    </WorkspaceContext.Provider>
  );
}
