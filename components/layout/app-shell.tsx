import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import styles from "@/components/overview/overview.module.css";
import type { OverviewProject, OverviewUser } from "@/components/overview/overview-data";

export function AppShell({ children, pageTitle, user, projects = [], onAddProject }: { children: ReactNode; pageTitle: string; user?: OverviewUser; projects?: OverviewProject[]; onAddProject?: () => void }) {
  return <div className={styles.shell}><AppSidebar user={user} projects={projects} onAddProject={onAddProject} /><div className={styles.workspace}><AppHeader pageTitle={pageTitle} /><main className={styles.main}>{children}</main></div></div>;
}
