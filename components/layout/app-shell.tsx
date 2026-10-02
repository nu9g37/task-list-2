"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import styles from "@/components/overview/overview.module.css";
import type { OverviewProject, OverviewUser } from "@/components/overview/overview-data";

export function AppShell({ children, pageTitle, user, projects = [], onAddProject, activeProjectId, onOpenProfile }: { children: ReactNode; pageTitle: string; user?: OverviewUser; projects?: OverviewProject[]; onAddProject?: () => void; activeProjectId?: string; onOpenProfile?: () => void }) {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerId = useId();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => drawerRef.current?.close();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 701px)");
    const closeOnDesktop = () => {
      if (desktop.matches) drawerRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const sidebarProps = { user, projects, onAddProject, onOpenProfile, activeProjectId };
  return <div className={styles.shell}>
    <div className={styles.desktopSidebar}><AppSidebar {...sidebarProps} /></div>
    <dialog ref={drawerRef} id={drawerId} className={styles.mobileSidebar} aria-label="Workspace menu" onClose={() => setSidebarOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeSidebar(); }}>
      <AppSidebar {...sidebarProps} onClose={closeSidebar} onAddProject={onAddProject ? () => { closeSidebar(); onAddProject(); } : undefined} onOpenProfile={onOpenProfile ? () => { closeSidebar(); onOpenProfile(); } : undefined} />
    </dialog>
    <div className={styles.workspace}>
      <AppHeader pageTitle={pageTitle} sidebarId={drawerId} sidebarOpen={sidebarOpen} onOpenSidebar={() => { drawerRef.current?.showModal(); setSidebarOpen(true); }} />
      <main className={styles.main}>{children}</main>
    </div>
  </div>;
}
