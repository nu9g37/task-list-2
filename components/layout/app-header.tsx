"use client";

import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "./workspace-layout";
import styles from "@/components/overview/overview.module.css";

export function AppHeader({ pageTitle }: { pageTitle: string }) {
  const { search, setSearch } = useWorkspace();
  return <header className={styles.header}><div className={styles.breadcrumb}><span>Workspace</span><Icon name="right" size={12} /><span>{pageTitle}</span></div><div className={styles.headerActions}><label className={styles.search}><Icon name="search" size={16} /><input type="search" aria-label={`Search tasks in ${pageTitle}`} placeholder="Search tasks..." title="Search title or description: %text%, text%, %text" value={search} onChange={(event) => setSearch(event.target.value)} /></label><button type="button" disabled className={styles.iconButton} aria-label="Notifications"></button></div></header>;
}
