"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/layout/workspace-layout";
import { searchOverview } from "@/components/tasks/task-search";
import { Icon } from "@/components/ui/icon";
import { FocusPanel } from "./focus-panel";
import { ProjectCards } from "./project-cards";
import { SummaryCards } from "./summary-cards";
import { TaskList } from "./task-list";
import { TaskForm } from "@/components/tasks/task-form";
import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import {
  loadOverview,
  OverviewRequestError,
  type ApiTask,
  type OverviewTask,
  type OverviewData,
} from "./overview-data";
import styles from "./overview.module.css";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: OverviewData }
  | { kind: "error" };

export function OverviewScreen({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { revision, publish, search } = useWorkspace();
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

  function refreshTasks() {
    setAttempt((value) => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    loadOverview(controller.signal, fetch, projectId)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ kind: "ready", data });
          publish(data);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof OverviewRequestError && error.status === 401) {
          router.replace("/sign-in");
          return;
        }
        setState({ kind: "error" });
      });
    return () => controller.abort();
  }, [attempt, router, projectId, revision, publish]);

  function retry() {
    setState({ kind: "loading" });
    setAttempt((value) => value + 1);
  }

  async function reorderTasks(taskIds: string[]) {
    const response = await fetch("/api/tasks/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds, ...(projectId ? { projectId } : {}) }),
    });
    if (response.status === 401) {
      router.replace("/sign-in");
      throw new Error("Your session has ended. Please sign in again.");
    }
    if (!response.ok) {
      if (response.status === 409) refreshTasks();
      throw new Error(
        response.status === 409
          ? "Tasks changed. Refreshing the list; please try again."
          : "Could not save task order. Please try again.",
      );
    }
    try {
      const updated = await loadOverview(undefined, fetch, projectId);
      setState({ kind: "ready", data: updated });
      publish(updated);
    } catch {
      retry();
    }
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
    if (!response.ok)
      throw new Error("Could not update the task. Please try again.");
    // Keep the list mounted so its selected tab is preserved during refresh.
    try {
      const updated = await loadOverview(undefined, fetch, projectId);
      setState({ kind: "ready", data: updated });
      publish(updated);
    } catch {
      // The mutation succeeded. Reload rather than showing the old task status.
      retry();
    }
  }

  const visibleData =
    state.kind === "ready" ? searchOverview(state.data, search) : undefined;

  return (
    <>
      {state.kind === "loading" ? (
        <section className={styles.loadState} role="status" aria-live="polite">
          <div className={styles.loadingLine} />
          <div className={styles.loadingCards}>
            {[1, 2, 3].map((id) => (
              <div key={id} />
            ))}
          </div>
          <p>Loading your workspace…</p>
        </section>
      ) : state.kind === "error" ? (
        <section className={styles.loadState} role="alert">
          <h1>Unable to load your workspace</h1>
          <p>Check your connection and try again.</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={retry}
          >
            Try again
          </button>
        </section>
      ) : (
        <>
          <section className={styles.greeting}>
            <div>
              <h1>
                {state.data.currentProject?.name ??
                  `${state.data.greeting}, ${state.data.user.name.trim().split(/\s+/)[0] || "there"}`}
              </h1>
              <p>
                {projectId
                  ? "Plan, track, and move this project forward."
                  : "Let’s make space for a productive day."}
              </p>
            </div>
            <div className={styles.greetingActions}>
              <span className={styles.date}>
                <Icon name="calendar" size={16} />
                <time dateTime={state.data.date}>{state.data.displayDate}</time>
              </span>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={createTask}
              >
                <Icon name="plus" size={14} />
                New task
              </button>
            </div>
          </section>
          <SummaryCards data={visibleData!} />
          <div className={styles.contentGrid}>
            <TaskList
              key={projectId ?? "overview"}
              tasks={visibleData!.tasks}
              searching={!!search.trim()}
              onAddTask={createTask}
              onStatusChange={changeTaskStatus}
              onEditTask={editTask}
              onDeleteTask={setDeletingTask}
              onReorder={reorderTasks}
            />
            <FocusPanel data={visibleData!} />
          </div>
          {!projectId && <ProjectCards projects={state.data.projects} />}
          {taskFormOpen && (
            <TaskForm
              open
              timezone={state.data.timezone}
              projects={state.data.projects}
              task={editingTask}
              defaultProjectId={projectId}
              onClose={() => setTaskFormOpen(false)}
              onCreated={refreshTasks}
            />
          )}
          {deletingTask && (
            <DeleteTaskDialog
              task={deletingTask}
              onClose={() => setDeletingTask(undefined)}
              onDeleted={refreshTasks}
            />
          )}
        </>
      )}
    </>
  );
}
