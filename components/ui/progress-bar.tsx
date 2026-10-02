import type { CSSProperties } from "react";
import styles from "@/components/overview/overview.module.css";

export function ProgressBar({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div
      className={styles.progressTrack}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      style={{ "--progress-color": color ?? "var(--green)" } as CSSProperties}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
