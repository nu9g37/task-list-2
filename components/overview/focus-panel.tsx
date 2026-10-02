import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { OverviewData } from "./overview-data";
import styles from "./overview.module.css";

export function FocusPanel({ data }: { data: OverviewData }) {
  const { focus, upcoming } = data;
  return (
    <div className={styles.focusColumn}>
      <section className={styles.focusCard} aria-labelledby="focus-heading">
        <div className={styles.focusLabel}>
          <span>YOUR DAILY FOCUS</span>
          <Icon name="clock" size={18} />
        </div>
        <h2 id="focus-heading">
          Small steps.
          <br />
          Real progress.
        </h2>
        <p>
          {focus.total
            ? `You’ve finished ${focus.completed} of ${focus.total} tasks due today.`
            : "No tasks due today. Make space for what matters."}
        </p>
        <ProgressBar
          value={focus.progress}
          label="Daily focus completion"
          color="#dbedc5"
        />
        <div className={styles.focusFooter}>
          <span>Keep the momentum going</span>
          <span>{focus.progress}%</span>
        </div>
      </section>
      <section
        className={styles.upcomingCard}
        aria-labelledby="upcoming-heading"
      >
        <div className={styles.upcomingLabel}>
          <span className={styles.dot} />
          <h2 id="upcoming-heading">COMING UP</h2>
        </div>
        {upcoming ? (
          <>
            <h3>{upcoming.title}</h3>
            <p>{upcoming.project}</p>
            <div className={styles.upcomingFooter}>
              <span>
                <Icon name="calendar" size={14} />
                {upcoming.label}
              </span>
            </div>
          </>
        ) : (
          <p className={styles.noUpcoming}>No upcoming deadlines.</p>
        )}
      </section>
    </div>
  );
}
