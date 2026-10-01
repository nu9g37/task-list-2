import { AppShell } from "@/components/layout/app-shell";
import { Icon } from "@/components/ui/icon";
import { FocusPanel } from "./focus-panel";
import { ProjectCards } from "./project-cards";
import { SummaryCards } from "./summary-cards";
import { TaskList } from "./task-list";
import styles from "./overview.module.css";

export function OverviewScreen() {
  return <AppShell pageTitle="Overview"><section className={styles.greeting}><div><h1>Good morning, Alex</h1><p>Let’s make space for a productive day.</p></div><div className={styles.greetingActions}><span className={styles.date}><Icon name="calendar" size={16} /><time dateTime="2026-09-30">Wed, Sep 30, 2026</time></span><button type="button" disabled className={styles.primaryButton}><Icon name="plus" size={14} />New task</button></div></section><SummaryCards /><div className={styles.contentGrid}><TaskList /><FocusPanel /></div><ProjectCards /></AppShell>;
}
