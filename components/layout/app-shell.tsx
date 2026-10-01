import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import styles from "@/components/overview/overview.module.css";

export function AppShell({ children, pageTitle }: { children: ReactNode; pageTitle: string }) {
  return <div className={styles.shell}><AppSidebar /><div className={styles.workspace}><AppHeader pageTitle={pageTitle} /><main className={styles.main}>{children}</main></div></div>;
}
