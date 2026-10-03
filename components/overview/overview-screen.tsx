"use client";
import { useOverview } from "./use-overview";

import { useState } from "react";
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
  type ApiTask,
  type OverviewTask,
  type OverviewData,
} from "./overview-data";
import styles from "./overview.module.css";

export function OverviewScreen({
  projectId,
  initialData,
}: {
  projectId?: string;
  initialData: OverviewData;
}) {
  const router = useRouter();
  const { search } = useWorkspace();
  const { data, error, retry, updateTasks, saveTask } = useOverview(
    initialData,
    projectId,
  );
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
      if (response.status === 409) retry();
      throw new Error(
        response.status === 409
          ? "Tasks changed. Refreshing the list; please try again."
          : "Could not save task order. Please try again.",
      );
    }
    const result: { positions: { id: string; position: number }[] } =
      await response.json();
    const positions = new Map(
      result.positions.map(({ id, position }) => [id, position]),
    );
    updateTasks((tasks) =>
      tasks.map((task) =>
        positions.has(task.id)
          ? {
              ...task,
              [projectId ? "positionProject" : "positionOverview"]:
                positions.get(task.id)!,
            }
          : task,
      ),
    );
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
    const result: { task: ApiTask } = await response.json();
    saveTask(result.task);
  }

  const visibleData = searchOverview(data, search);

  return (
    <>
      {error ? (
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
                {data.currentProject?.name ??
                  `${data.greeting}, ${data.user.name.trim().split(/\s+/)[0] || "there"}`}
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
                <time dateTime={data.date}>{data.displayDate}</time>
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
          {!projectId && <ProjectCards projects={data.projects} />}
          {taskFormOpen && (
            <TaskForm
              open
              timezone={data.timezone}
              projects={data.projects}
              task={editingTask}
              defaultProjectId={projectId}
              onClose={() => setTaskFormOpen(false)}
              onCreated={saveTask}
            />
          )}
          {deletingTask && (
            <DeleteTaskDialog
              task={deletingTask}
              onClose={() => setDeletingTask(undefined)}
              onDeleted={() =>
                updateTasks((tasks) =>
                  tasks.filter((task) => task.id !== deletingTask.id),
                )
              }
            />
          )}
        </>
      )}
    </>
  );
}
