"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Icon } from "@/components/ui/icon";
import { FocusPanel } from "./focus-panel";
import { ProjectCards } from "./project-cards";
import { SummaryCards } from "./summary-cards";
import { TaskList } from "./task-list";
import { TaskForm } from "@/components/tasks/task-form";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { loadOverview, OverviewRequestError, type ApiTask, type OverviewTask, type OverviewData } from "./overview-data";
import styles from "./overview.module.css";

type LoadState = { kind: "loading" } | { kind: "ready"; data: OverviewData } | { kind: "error" };

export function OverviewScreen() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask>();
  const [deletingTask, setDeletingTask] = useState<OverviewTask>();

  function createTask() {
    setEditingTask(undefined);
    setTaskFormOpen(true);
  }

  function editTask(task: OverviewTask) {
    setEditingTask(task.source);
    setTaskFormOpen(true);
  }

  function refreshTasks() { setAttempt((value) => value + 1); }

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

  async function changeTaskStatus(id: string, completed: boolean) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: completed ? "DONE" : "TODO" }),
    });
    if (response.status === 401) {
      router.replace("/sign-in");
      throw new Error("Your session has ended. Please sign in again.");
    }
    if (!response.ok) throw new Error("Could not update the task. Please try again.");
    // Keep the list mounted so its selected tab is preserved during refresh.
    try {
      const updated = await loadOverview();
      setState({ kind: "ready", data: updated });
    } catch {
      // The mutation succeeded. Reload rather than showing the old task status.
      retry();
    }
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
            <button type="button" className={styles.primaryButton} onClick={createTask}><Icon name="plus" size={14} />New task</button>
          </div>
        </section>
        <SummaryCards data={state.data} />
        <div className={styles.contentGrid}><TaskList tasks={state.data.tasks} onAddTask={createTask} onStatusChange={changeTaskStatus} onEditTask={editTask} onDeleteTask={setDeletingTask} /><FocusPanel data={state.data} /></div>
        <ProjectCards projects={state.data.projects} />
        {taskFormOpen && <TaskForm open projects={state.data.projects} task={editingTask} onClose={() => setTaskFormOpen(false)} onCreated={refreshTasks} />}
        {deletingTask && <DeleteTaskDialog task={deletingTask} onClose={() => setDeletingTask(undefined)} onDeleted={refreshTasks} />}
      </>}
    </AppShell>
  );
}
