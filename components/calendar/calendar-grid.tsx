import type { CSSProperties } from "react";
import { formatDay, monthDays, weekDays, type CalendarTask } from "./calendar-data";
import styles from "./calendar.module.css";

export function CalendarGrid({ month, selectedDay, today, tasks, view, onSelect }: { month: string; selectedDay: string; today: string; tasks: CalendarTask[]; view: "Month" | "Week" | "Agenda"; onSelect: (day: string) => void }) {
  if (view === "Agenda") {
    const scheduled = tasks.filter((task) => task.day.startsWith(month));
    return <div className={styles.agenda}>{scheduled.length ? scheduled.map((task) => <button key={task.source.id} onClick={() => onSelect(task.day)} className={styles.agendaRow}><span>{formatDay(task.day, { month: "short", day: "numeric" })}<small>{task.time}</small></span><span className={styles.event} style={{ "--event-color": task.color } as CSSProperties}>{task.source.title}</span></button>) : <p className={styles.empty}>No scheduled tasks this month.</p>}</div>;
  }
  const days = view === "Week" ? weekDays(selectedDay) : monthDays(month);
  return <><div className={styles.weekdays}>{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <span key={day}>{day}</span>)}</div><div className={styles.dateGrid} style={{ "--week-count": days.length / 7 } as CSSProperties}>{days.map((day, index) => {
    const events = tasks.filter((task) => task.day === day);
    return <button type="button" key={day} className={`${styles.dayCell} ${index % 7 >= 5 ? styles.weekend : ""} ${!day.startsWith(month) ? styles.outside : ""} ${selectedDay === day ? styles.selected : ""}`} aria-label={`${formatDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}, ${events.length} tasks`} aria-pressed={selectedDay === day} onClick={() => onSelect(day)}><span className={`${styles.dayNumber} ${today === day ? styles.todayNumber : ""}`}>{Number(day.slice(-2))}</span><span className={styles.events}>{events.slice(0, 3).map((task) => <span key={task.source.id} className={`${styles.event} ${task.source.status === "DONE" ? styles.done : ""}`} style={{ "--event-color": task.color } as CSSProperties}>{task.source.title}</span>)}{events.length > 3 && <span className={styles.more}>+{events.length - 3} more</span>}</span></button>;
  })}</div></>;
}
