"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ProjectNavItem } from "@/components/projects/project-nav-item";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { OverviewProject, OverviewUser } from "@/components/overview/overview-data";
import styles from "@/components/overview/overview.module.css";

export function AppSidebar({ user, projects, onAddProject, activeProjectId, onOpenProfile, onClose }: { user?: OverviewUser; projects: OverviewProject[]; onAddProject?: () => void; activeProjectId?: string; onOpenProfile?: () => void; onClose?: () => void }) {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const calendarActive = usePathname() === "/calendar";
  const projectListId = useId();
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase() || "—";
  return <aside className={styles.sidebar} aria-label="Workspace sidebar">
    <div className={styles.brand}><span className={styles.logo}>T</span><span>Tasklist 2</span>{onClose && <button type="button" className={styles.sidebarClose} onClick={onClose} aria-label="Close sidebar"><Icon name="close" size={22} /></button>}</div>
    <nav className={styles.navigation} aria-label="Main navigation" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) onClose?.(); }}>
      <Link href="/" className={`${styles.navItem} ${!activeProjectId && !calendarActive ? styles.navActive : ""}`} aria-current={!activeProjectId && !calendarActive ? "page" : undefined}><Icon name="grid" size={20} /><span>Overview</span></Link>
      <Link href="/calendar" className={`${styles.navItem} ${calendarActive ? styles.navActive : ""}`} aria-current={calendarActive ? "page" : undefined}><Icon name="calendar" size={20} /><span>Calendar</span></Link>
      <button type="button" className={`${styles.navItem} ${styles.projectToggle} ${projectsOpen ? "" : styles.projectCollapsed}`} aria-expanded={projectsOpen} aria-controls={projectListId} onClick={() => setProjectsOpen((value) => !value)}><Icon name="folder" size={20} /><span>Project</span><Icon name="chevron" size={14} /></button>
      <div id={projectListId} className={styles.projectNavigation} hidden={!projectsOpen}>
        {projects.map((project) => <ProjectNavItem key={project.id} project={project} active={activeProjectId === project.id} />)}
        <button type="button" disabled={!onAddProject || !user} className={styles.addProject} onClick={onAddProject}><Icon name="plus" size={16} />Add project</button>
      </div>
    </nav>
    <div className={styles.sidebarFooter}><button type="button" className={styles.profile} onClick={onOpenProfile} disabled={!user || !onOpenProfile} aria-label="Open profile" aria-haspopup="dialog"><span className={styles.avatar}>{initials}</span><span className={styles.profileCopy}><span className={styles.profileName}>{user?.name ?? "Your workspace"}</span><span>Personal workspace</span></span><Icon name="chevron" size={16} /></button></div>
  </aside>;
}
