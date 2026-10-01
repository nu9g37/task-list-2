"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { OverviewProject, OverviewUser } from "@/components/overview/overview-data";
import styles from "@/components/overview/overview.module.css";

export function AppSidebar({ user, projects, onAddProject }: { user?: OverviewUser; projects: OverviewProject[]; onAddProject?: () => void }) {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const projectListId = useId();
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase() || "—";
  return <aside className={styles.sidebar} aria-label="Workspace sidebar">
    <div className={styles.brand}><span className={styles.logo}>T</span><span>Tasklist 2</span></div>
    <nav className={styles.navigation} aria-label="Main navigation">
      <button type="button" disabled className={`${styles.navItem} ${styles.navActive}`} aria-current="page"><Icon name="grid" size={20} /><span>Overview</span></button>
      <button type="button" disabled className={styles.navItem}><Icon name="calendar" size={20} /><span>Calendar</span></button>
      <button type="button" className={`${styles.navItem} ${styles.projectToggle} ${projectsOpen ? "" : styles.projectCollapsed}`} aria-expanded={projectsOpen} aria-controls={projectListId} onClick={() => setProjectsOpen((value) => !value)}><Icon name="folder" size={20} /><span>Project</span><Icon name="chevron" size={14} /></button>
      <div id={projectListId} className={styles.projectNavigation} hidden={!projectsOpen}>
        {projects.map((project) => <button key={project.id} type="button" disabled className={styles.projectNavItem}><span className={styles.dot} style={{ background: project.color }} /><span>{project.name}</span><span className={styles.projectCount}>{project.tasks}</span></button>)}
        <button type="button" disabled={!onAddProject || !user} className={styles.addProject} onClick={onAddProject}><Icon name="plus" size={16} />Add project</button>
      </div>
    </nav>
    <div className={styles.sidebarFooter}><button type="button" disabled className={styles.help}><Icon name="help" size={18} />Help &amp; shortcuts</button><div className={styles.profile}><span className={styles.avatar}>{initials}</span><div><p>{user?.name ?? "Your workspace"}</p><span>Personal workspace</span></div><Icon name="chevron" size={16} /></div></div>
  </aside>;
}
