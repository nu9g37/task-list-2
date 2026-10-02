import { Icon, type IconName } from "@/components/ui/icon";
import type { OverviewData } from "./overview-data";
import styles from "./overview.module.css";

export function SummaryCards({ data }: { data: OverviewData }) {
  const difference = data.weekDifference;
  const comparison =
    difference === 0
      ? "Same as last week"
      : `${difference > 0 ? "↑" : "↓"} ${Math.abs(difference)} ${difference > 0 ? "more" : "fewer"} than last week`;
  const cards: {
    value: number;
    title: string;
    detail: string;
    icon: IconName;
    upcoming?: boolean;
  }[] = [
    {
      value: data.summary.todayTasks,
      title: "Tasks today",
      detail: `${data.summary.todayTasks} left to focus on`,
      icon: "calendar",
    },
    {
      value: data.completedThisWeek,
      title: "Completed this week",
      detail: comparison,
      icon: "check",
    },
    {
      value: data.upcomingCount,
      title: "Upcoming deadlines",
      detail: "Next 7 days",
      icon: "clock",
      upcoming: true,
    },
  ];
  return (
    <section className={styles.summaryGrid} aria-label="Task summary">
      {cards.map((card) => (
        <article key={card.title} className={styles.summaryCard}>
          <div>
            <div className={styles.statHeading}>
              <strong>{card.value}</strong>
              <span>{card.title}</span>
            </div>
            <p className={card.upcoming ? undefined : styles.greenText}>
              {card.detail}
            </p>
          </div>
          <span
            className={`${styles.statIcon} ${card.upcoming ? styles.upcomingIcon : ""}`}
          >
            <Icon name={card.icon} size={18} />
          </span>
        </article>
      ))}
    </section>
  );
}
