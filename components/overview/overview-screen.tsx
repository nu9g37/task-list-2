"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Icon } from "@/components/ui/icon";
import { FocusPanel } from "./focus-panel";
import { ProjectCards } from "./project-cards";
import { SummaryCards } from "./summary-cards";
import { TaskList } from "./task-list";
import { loadOverview, OverviewRequestError, type OverviewData } from "./overview-data";
import styles from "./overview.module.css";

type LoadState = { kind: "loading" } | { kind: "ready"; data: OverviewData } | { kind: "error" };

export function OverviewScreen() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadOverview(controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ kind: "ready", data });
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof OverviewRequestError && error.status === 401) {
        router.replace("/sign-in");
        return;
      }
      setState({ kind: "error" });
    });
    return () => controller.abort();
  }, [attempt, router]);

  function retry() {
    setState({ kind: "loading" });
    setAttempt((value) => value + 1);
  }

  const data = state.kind === "ready" ? state.data : undefined;
  return (
    <AppShell pageTitle="Overview" user={data?.user} projects={data?.projects}>
      {state.kind === "loading" ? <section className={styles.loadState} role="status" aria-live="polite">
        <div className={styles.loadingLine} /><div className={styles.loadingCards}>{[1, 2, 3].map((id) => <div key={id} />)}</div>
        <p>Loading your workspace…</p>
      </section> : state.kind === "error" ? <section className={styles.loadState} role="alert">
        <h1>Unable to load your workspace</h1>
        <p>Check your connection and try again.</p>
        <button type="button" className={styles.primaryButton} onClick={retry}>Try again</button>
      </section> : <>
        <section className={styles.greeting}>
          <div><h1>{state.data.greeting}, {state.data.user.name.trim().split(/\s+/)[0] || "there"}</h1><p>Let’s make space for a productive day.</p></div>
          <div className={styles.greetingActions}>
            <span className={styles.date}><Icon name="calendar" size={16} /><time dateTime={state.data.date}>{state.data.displayDate}</time></span>
            <button type="button" disabled className={styles.primaryButton}><Icon name="plus" size={14} />New task</button>
          </div>
        </section>
        <SummaryCards data={state.data} />
        <div className={styles.contentGrid}><TaskList tasks={state.data.todayTasks} /><FocusPanel data={state.data} /></div>
        <ProjectCards projects={state.data.projects} />
      </>}
    </AppShell>
  );
}
