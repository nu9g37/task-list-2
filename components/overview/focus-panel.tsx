import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import styles from "./overview.module.css";

export function FocusPanel() {
  return <div className={styles.focusColumn}><section className={styles.focusCard} aria-labelledby="focus-heading"><div className={styles.focusLabel}><span>YOUR DAILY FOCUS</span><Icon name="clock" size={18} /></div><h2 id="focus-heading">Small steps.<br />Real progress.</h2><p>You’ve finished 8 of 12 tasks today.</p><ProgressBar value={67} label="Daily focus completion" color="#dbedc5" /><div className={styles.focusFooter}><span>Keep the momentum going</span><span>67%</span></div></section><section className={styles.upcomingCard} aria-labelledby="upcoming-heading"><div className={styles.upcomingLabel}><span className={styles.dot} /><h2 id="upcoming-heading">COMING UP</h2></div><h3>Homepage design review</h3><p>Website redesign</p><div className={styles.upcomingFooter}><span><Icon name="calendar" size={14} />Tomorrow, 10:00 AM</span><Icon name="arrow" size={16} /></div></section></div>;
}
