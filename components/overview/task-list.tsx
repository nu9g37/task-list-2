import { Icon } from "@/components/ui/icon";
import type { OverviewTask } from "./overview-data";
import styles from "./overview.module.css";

function TaskRow({ task }: { task: OverviewTask }) {
  return <li className={`${styles.taskRow} ${task.completed ? styles.completedRow : ""}`}><input type="checkbox" defaultChecked={task.completed} disabled aria-label={`Complete ${task.title}`} /><div className={styles.taskCopy}><p>{task.title}</p><span>{task.project} · {task.detail}</span></div><span className={`${styles.badge} ${styles[`priority${task.priority}`]}`}>{task.priority}</span><button type="button" disabled className={styles.iconButton} aria-label={`More options for ${task.title}`}><Icon name="more" size={16} /></button></li>;
}
export function TaskList({ tasks, onAddTask }: { tasks: OverviewTask[]; onAddTask: () => void }) {
  return <section className={styles.taskPanel} aria-labelledby="today-tasks-heading"><div className={styles.taskPanelHeader}><div className={styles.taskToolbar}><div className={styles.sectionTitle}><h2 id="today-tasks-heading">Today’s tasks</h2><span className={styles.countBadge}>{tasks.length}</span></div><div className={styles.taskActions}><button type="button" disabled className={styles.filterButton}><Icon name="filter" size={15} />Filter</button><button type="button" className={styles.softButton} onClick={onAddTask}><Icon name="plus" size={16} />Add task</button></div></div><div className={styles.taskTabs} aria-label="Task views"><button type="button" disabled className={styles.activeTab}>All tasks</button><button type="button" disabled>In progress</button><button type="button" disabled>Completed</button></div></div>{tasks.length ? <ul className={styles.tasks}>{tasks.map((task) => <TaskRow key={task.id} task={task} />)}</ul> : <p className={styles.emptyState}>No tasks due today. Enjoy a little breathing room.</p>}</section>;
}
