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
import { ProjectForm } from "@/features/projects/components/project-form";
import { DeleteProjectDialog } from "@/features/projects/components/delete-project-dialog";
import { ProfileForm } from "@/features/profile/components/profile-form";
import type {
  ApiProject,
  OverviewData,
  OverviewProject,
  OverviewUser,
} from "@/features/overview/data";

type ProjectChange = { project: ApiProject } | { order: string[] };

const WorkspaceContext = createContext<{
  revision: number;
  publish: (data: OverviewData) => void;
  search: string;
  setSearch: (value: string) => void;
  editProject: (project: OverviewProject) => void;
  deleteProject: (project: OverviewProject) => void;
  saveProject: (project: ApiProject) => void;
  subscribeProjects: (listener: (change: ProjectChange) => void) => () => void;
  reorderProjects: (ids: string[]) => Promise<void>;
  reordering: boolean;
} | null>(null);

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("Workspace layout is required");
  return workspace;
}

function decodeProjectSegment(pathname: string): string | undefined {
  if (!pathname.startsWith("/projects/")) return undefined;
  const segment = pathname.split("/")[2];
  if (!segment) return undefined;
  try {
    return decodeURIComponent(segment) || undefined;
  } catch {
    return undefined;
  }
}

export function WorkspaceLayout({
  children,
  initialUser,
  initialProjects = [],
}: {
  children: ReactNode;
  initialUser?: OverviewUser;
  initialProjects?: OverviewProject[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searches, setSearches] = useState<Record<string, string>>({});
  const search = searches[pathname] ?? "";
  const setSearch = (value: string) =>
    setSearches((previous) => ({ ...previous, [pathname]: value }));
  const activeProjectId = decodeProjectSegment(pathname);
  const [sidebar, setSidebar] = useState<{
    user?: OverviewUser;
    projects: OverviewProject[];
  }>({ user: initialUser, projects: initialProjects });
  const [projectForm, setProjectForm] = useState<{
    project?: OverviewProject;
  } | null>(null);
  const [deletingProject, setDeletingProject] =
    useState<OverviewProject | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [reordering, setReordering] = useState(false);
  const savingOrder = useRef(false);
  const projectListeners = useRef(new Set<(change: ProjectChange) => void>());
  const subscribeProjects = useCallback(
    (listener: (change: ProjectChange) => void) => {
      projectListeners.current.add(listener);
      return () => {
        projectListeners.current.delete(listener);
      };
    },
    [],
  );
  function saveProject(project: ApiProject) {
    if (projectListeners.current.size === 0) {
      setSidebar((previous) => {
        const existing = previous.projects.find((p) => p.id === project.id);
        const updated: OverviewProject = existing
          ? { ...existing, ...project }
          : { ...project, tasks: 0, remaining: 0, progress: 0 };
        const projects = [
          ...previous.projects.filter((p) => p.id !== project.id),
          updated,
        ].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
        return { ...previous, projects };
      });
      return;
    }
    projectListeners.current.forEach((listener) => listener({ project }));
  }
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
      if (activeProjectId === deletedId) {
        router.replace("/");
        return;
      }
    }
    setRevision((value) => value + 1);
  }

  async function reorderProjects(ids: string[]) {
    if (savingOrder.current) return;
    const previous = sidebar.projects;
    const byId = new Map(previous.map((project) => [project.id, project]));
    savingOrder.current = true;
    setReordering(true);
    setSidebar((value) => ({
      ...value,
      projects: ids.flatMap((id, position) => {
        const project = byId.get(id);
        return project ? [{ ...project, position }] : [];
      }),
    }));
    try {
      const response = await fetch("/api/projects/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: ids }),
      });
      if (!response.ok)
        throw new Error("Unable to save project order. Please try again.");
      savingOrder.current = false;
      projectListeners.current.forEach((listener) => listener({ order: ids }));
    } catch (error) {
      setSidebar((value) => ({ ...value, projects: previous }));
      setRevision((value) => value + 1);
      throw error;
    } finally {
      savingOrder.current = false;
      setReordering(false);
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        revision,
        publish,
        search,
        setSearch,
        editProject: (project) => setProjectForm({ project }),
        deleteProject: (project) => setDeletingProject(project),
        saveProject,
        subscribeProjects,
        reorderProjects,
        reordering,
      }}
    >
      <AppShell
        pageTitle={title}
        activeProjectId={activeProjectId}
        user={sidebar.user}
        projects={sidebar.projects}
        onAddProject={() => setProjectForm({})}
        onOpenProfile={() => setProfileOpen(true)}
      >
        {children}
        {projectForm && (
          <ProjectForm
            project={projectForm.project}
            onClose={() => setProjectForm(null)}
            onCreated={saveProject}
          />
        )}
        {deletingProject && (
          <DeleteProjectDialog
            project={deletingProject}
            onClose={() => setDeletingProject(null)}
            onDeleted={() => projectChanged(deletingProject.id)}
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
