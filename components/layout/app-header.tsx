import { Icon } from "@/components/ui/icon";
import styles from "@/components/overview/overview.module.css";

export function AppHeader({ pageTitle }: { pageTitle: string }) {
  return <header className={styles.header}><div className={styles.breadcrumb}><span>Workspace</span><Icon name="right" size={12} /><span>{pageTitle}</span></div><div className={styles.headerActions}><label className={styles.search}><Icon name="search" size={16} /><input type="search" aria-label="Search workspace" placeholder="Search anything..." readOnly /></label><button type="button" disabled className={styles.iconButton} aria-label="Notifications"><Icon name="bell" size={22} /></button></div></header>;
}
