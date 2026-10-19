"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import styles from "@/features/overview/components/overview.module.css";
import type {
  OverviewProject,
  OverviewUser,
} from "@/features/overview/data";

export function AppShell({
  children,
  pageTitle,
  user,
  projects = [],
  onAddProject,
  activeProjectId,
  onOpenProfile,
  profileActive = false,
}: {
  children: ReactNode;
  pageTitle: string;
  user?: OverviewUser;
  projects?: OverviewProject[];
  onAddProject?: () => void;
  activeProjectId?: string;
  onOpenProfile?: () => void;
  profileActive?: boolean;
}) {
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerId = useId();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const calendarActive = pathname === "/calendar";
  const mobileTitle = profileActive
    ? "Profile"
    : calendarActive
      ? "Calendar"
      : "Home";
  const closeSidebar = () => drawerRef.current?.close();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 701px)");
    const closeOnDesktop = () => {
      if (desktop.matches) drawerRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const sidebarProps = {
    user,
    projects,
    onAddProject,
    onOpenProfile,
    activeProjectId,
  };
  return (
    <div className={styles.shell}>
      <div className={styles.desktopSidebar}>
        <AppSidebar {...sidebarProps} />
      </div>
      <dialog
        ref={drawerRef}
        id={drawerId}
        className={styles.mobileSidebar}
        aria-label="Workspace menu"
        onClose={() => setSidebarOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeSidebar();
        }}
      >
        <AppSidebar
          {...sidebarProps}
          onClose={closeSidebar}
          onAddProject={
            onAddProject
              ? () => {
                  closeSidebar();
                  onAddProject();
                }
              : undefined
          }
          onOpenProfile={
            onOpenProfile
              ? () => {
                  closeSidebar();
                  onOpenProfile();
                }
              : undefined
          }
        />
      </dialog>
      <div className={styles.workspace}>
        <AppHeader
          pageTitle={pageTitle}
          mobileTitle={mobileTitle}
          sidebarId={drawerId}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => {
            drawerRef.current?.showModal();
            setSidebarOpen(true);
          }}
        />
        <main className={styles.main}>{children}</main>
        <nav className={styles.mobileNavigation} aria-label="Main navigation">
          <Link
            href="/"
            className={`${styles.mobileNavItem} ${!calendarActive && !profileActive ? styles.mobileNavActive : ""}`}
            aria-current={
              !calendarActive && !profileActive ? "page" : undefined
            }
          >
            <span className={styles.mobileNavIcon}>
              <Icon name="home" size={24} strokeWidth={2.4} />
            </span>
            <span>Home</span>
          </Link>
          <Link
            href="/calendar"
            className={`${styles.mobileNavItem} ${calendarActive ? styles.mobileNavActive : ""}`}
            aria-current={calendarActive ? "page" : undefined}
          >
            <span className={styles.mobileNavIcon}>
              <Icon name="calendar" size={24} strokeWidth={2.4} />
            </span>
            <span>Calendar</span>
          </Link>
          <button
            type="button"
            className={`${styles.mobileNavItem} ${profileActive ? styles.mobileNavActive : ""}`}
            aria-pressed={profileActive}
            onClick={onOpenProfile}
          >
            <span className={styles.mobileNavIcon}>
              <Icon name="profile" size={24} strokeWidth={2.4} />
            </span>
            <span>Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
