import { Icon, type IconName } from "@/components/ui/icon";
import styles from "./overview.module.css";

const cards: { value: number; title: string; detail: string; icon: IconName; accent?: boolean; upcoming?: boolean }[] = [
  { value: 12, title: "Tasks today", detail: "4 left to focus on", icon: "calendar", accent: true },
  { value: 28, title: "Completed this week", detail: "↑ 8 more than last week", icon: "check", accent: true },
  { value: 2, title: "Upcoming deadlines", detail: "Next 7 days", icon: "clock", upcoming: true },
];
export function SummaryCards() {
  return <section className={styles.summaryGrid} aria-label="Task summary">{cards.map((card) => <article key={card.title} className={styles.summaryCard}><div><div className={styles.statHeading}><strong>{card.value}</strong><span>{card.title}</span></div><p className={card.accent ? styles.greenText : undefined}>{card.detail}</p></div><span className={`${styles.statIcon} ${card.upcoming ? styles.upcomingIcon : ""}`}><Icon name={card.icon} size={18} /></span></article>)}</section>;
}
