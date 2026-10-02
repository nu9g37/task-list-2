import { Icon } from "@/components/ui/icon";
import type { OverviewData } from "@/components/overview/overview-data";
import { formatDay, type CalendarTask } from "./calendar-data";
import styles from "./calendar.module.css";

export function DayPanel({
  day,
  tasks,
  data,
  error,
  updating,
  onToggle,
}: {
  day: string;
  tasks: CalendarTask[];
  data: OverviewData;
  error: string;
  updating: boolean;
  onToggle: (task: CalendarTask) => void;
}) {
  const due = tasks.filter((task) => task.day === day);
  return (
    <aside className={styles.rightColumn}>
      <section className={styles.dayPanel}>
        <p className={styles.eyebrow}>
          {formatDay(day, { weekday: "long" }).toUpperCase()}
        </p>
        <h2>{formatDay(day, { month: "long", day: "numeric" })}</h2>
        <p className={styles.remaining}>
          {due.filter((task) => task.source.status !== "DONE").length} tasks
          remaining
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <ul className={styles.dayTasks}>
          {due.length ? (
            due.map((task) => (
              <li key={task.source.id}>
                <time>{task.time}</time>
                <label>
                  <input
                    type="checkbox"
                    disabled={updating}
                    checked={task.source.status === "DONE"}
                    onChange={() => onToggle(task)}
                  />
                  <span
                    className={task.source.status === "DONE" ? styles.done : ""}
                  >
                    {task.source.title}
                  </span>
                </label>
                <p>
                  <span
                    className={styles.dot}
                    style={{ background: task.color }}
                  />
                  {task.project}
                </p>
              </li>
            ))
          ) : (
            <li className={styles.empty}>No tasks scheduled for this day.</li>
          )}
        </ul>
      </section>
      <section className={styles.nextCard}>
        <p className={styles.eyebrow}>COMING UP NEXT</p>
        {data.upcoming ? (
          <>
            <h3>{data.upcoming.title}</h3>
            <p>{data.upcoming.project}</p>
            <span>
              <Icon name="clock" size={18} />
              {data.upcoming.label}
            </span>
          </>
        ) : (
          <p>No upcoming deadlines.</p>
        )}
      </section>
      <section className={styles.legend} aria-label="Project colors">
        <h3>PROJECTS</h3>
        {data.projects.map((project) => (
          <p key={project.id}>
            <span
              className={styles.dot}
              style={{ background: project.color }}
            />
            {project.name}
          </p>
        ))}
      </section>
    </aside>
  );
}
