import { Icon } from "@/components/ui/icon";
import { demoProjects, demoUser } from "@/components/overview/demo-data";
import styles from "@/components/overview/overview.module.css";

export function AppSidebar() {
  return <aside className={styles.sidebar} aria-label="Workspace sidebar">
    <div className={styles.brand}><span className={styles.logo}>T</span><span>Tasklist 2</span></div>
    <nav className={styles.navigation} aria-label="Main navigation">
      <button type="button" disabled className={`${styles.navItem} ${styles.navActive}`} aria-current="page"><Icon name="grid" size={20} /><span>Overview</span></button>
      <button type="button" disabled className={styles.navItem}><Icon name="calendar" size={20} /><span>Calendar</span></button>
      <button type="button" disabled className={styles.navItem}><Icon name="folder" size={20} /><span>Project</span><Icon name="chevron" size={14} /></button>
      <div className={styles.projectNavigation}>
        {demoProjects.map((project) => <button key={project.id} type="button" disabled className={styles.projectNavItem}><span className={styles.dot} style={{ background: project.color }} /><span>{project.name}</span><span className={styles.projectCount}>{project.tasks}</span></button>)}
        <button type="button" disabled className={styles.addProject}><Icon name="plus" size={16} />Add project</button>
      </div>
    </nav>
    <div className={styles.sidebarFooter}><button type="button" disabled className={styles.help}><Icon name="help" size={18} />Help &amp; shortcuts</button><div className={styles.profile}><span className={styles.avatar}>{demoUser.initials}</span><div><p>{demoUser.name}</p><span>{demoUser.workspace}</span></div><Icon name="chevron" size={16} /></div></div>
  </aside>;
}
