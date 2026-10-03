"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { OverviewTask } from "./overview-data";
import { TaskRow } from "./task-row";
import styles from "./overview.module.css";

export function TaskList({
  tasks,
  searching = false,
  onAddTask,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onReorder,
}: {
  tasks: OverviewTask[];
  searching?: boolean;
  onAddTask: () => void;
  onStatusChange: (id: string, completed: boolean) => Promise<void>;
  onEditTask: (task: OverviewTask) => void;
  onDeleteTask: (task: OverviewTask) => void;
  onReorder: (taskIds: string[]) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "today" | "done">("all");
  const [updating, setUpdating] = useState<{
    id: string;
    completed: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const saving = useRef(false);
  const list = useRef<HTMLUListElement>(null);
  const drag = useRef<{ id: string; index: number } | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const busy = !!updating || order !== null;
  const unfinishedTasks = tasks.filter((task) => !task.completed);
  const canReorder =
    activeTab === "all" && !searching && unfinishedTasks.length > 1;

  async function move(id: string, index: number) {
    if (!canReorder || busy || saving.current) return;
    const unfinishedIds = unfinishedTasks.map((task) => task.id);
    const from = unfinishedIds.indexOf(id);
    if (from < 0 || from === index) return;
    unfinishedIds.splice(from, 1);
    unfinishedIds.splice(index, 0, id);
    // The API requires all task IDs; keep hidden completed tasks in their slots.
    let next = 0;
    const ids = tasks.map((task) =>
      task.completed ? task.id : unfinishedIds[next++],
    );
    saving.current = true;
    setOrder(ids);
    setError("");
    setMessage("");
    try {
      await onReorder(ids);
      setMessage(`Task moved to position ${index + 1}.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save task order.",
      );
    } finally {
      saving.current = false;
      setOrder(null);
      requestAnimationFrame(() => {
        const row = Array.from(
          list.current?.querySelectorAll<HTMLElement>("[data-task-id]") ?? [],
        ).find((row) => row.dataset.taskId === id);
        row
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus({ preventScroll: true });
      });
    }
  }

  async function toggle(task: OverviewTask, completed: boolean) {
    if (busy || saving.current) return;
    setError("");
    setUpdating({ id: task.id, completed });
    try {
      await onStatusChange(task.id, completed);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update the task. Please try again.",
      );
    } finally {
      setUpdating(null);
    }
  }
  const tabs = [
    { id: "all", label: "All tasks" },
    { id: "today", label: "Today's tasks" },
    { id: "done", label: "Done" },
  ] as const;
  const orderedTasks = order
    ? order.flatMap((id) => tasks.filter((task) => task.id === id))
    : tasks;
  const visibleTasks = orderedTasks.filter((task) =>
    activeTab === "all"
      ? !task.completed
      : activeTab === "today"
        ? task.dueToday
        : task.completed,
  );
  const emptyMessage = searching
    ? "No tasks match your search in this view."
    : activeTab === "today"
      ? "No tasks due today. Enjoy a little breathing room."
      : activeTab === "done"
        ? "No completed tasks yet. One small step at a time."
        : "No unfinished tasks. Add a new task to get started.";

  return (
    <section className={styles.taskPanel} aria-labelledby="tasks-heading">
      <div className={styles.taskPanelHeader}>
        <div className={styles.taskToolbar}>
          <div className={styles.sectionTitle}>
            <h2 id="tasks-heading">Task</h2>
            <span className={styles.countBadge}>{visibleTasks.length}</span>
          </div>
          <div className={styles.taskActions}>
            <button type="button" disabled className={styles.filterButton}>
              <Icon name="filter" size={15} />
              Filter
            </button>
            <button
              type="button"
              className={styles.softButton}
              onClick={onAddTask}
              disabled={busy}
            >
              <Icon name="plus" size={16} />
              Add task
            </button>
          </div>
        </div>
        <div className={styles.taskTabs} aria-label="Task views">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              disabled={busy}
              className={activeTab === tab.id ? styles.activeTab : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className={styles.taskUpdateError}>
          {error}
        </p>
      )}
      <span className={styles.orderAnnouncement} role="status">
        {message}
      </span>
      {visibleTasks.length ? (
        <ul ref={list} className={styles.tasks} aria-busy={busy}>
          {visibleTasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              pending={busy}
              orderClassName={
                canReorder && dragging
                  ? dragging.id === task.id
                    ? styles.taskDragSource
                    : dragging.index === index
                      ? visibleTasks.findIndex(
                          (row) => row.id === dragging.id,
                        ) < index
                        ? styles.taskDropAfter
                        : styles.taskDropBefore
                      : ""
                  : ""
              }
              reorderHandle={
                canReorder ? (
                  <button
                    type="button"
                    className={styles.taskDragHandle}
                    disabled={busy}
                    aria-label={`Reorder ${task.title}. Use Alt and Up or Down arrow.`}
                    title="Drag to reorder, or use Alt + Up/Down"
                    onPointerDown={(event) => {
                      if (busy || event.button !== 0 || !event.isPrimary)
                        return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      drag.current = { id: task.id, index };
                      setDragging(drag.current);
                    }}
                    onPointerMove={(event) => {
                      if (!drag.current || !list.current) return;
                      const rows = Array.from(
                        list.current.querySelectorAll<HTMLElement>(
                          "[data-task-id]",
                        ),
                      );
                      const target = rows.findIndex(
                        (row) =>
                          event.clientY < row.getBoundingClientRect().bottom,
                      );
                      const next = target < 0 ? rows.length - 1 : target;
                      drag.current = { ...drag.current, index: next };
                      setDragging(drag.current);
                      const bounds = list.current.getBoundingClientRect();
                      if (event.clientY < bounds.top + 32)
                        list.current.scrollTop -= 16;
                      if (event.clientY > bounds.bottom - 32)
                        list.current.scrollTop += 16;
                    }}
                    onPointerUp={(event) => {
                      const current = drag.current;
                      drag.current = null;
                      setDragging(null);
                      event.currentTarget.releasePointerCapture(
                        event.pointerId,
                      );
                      if (current) void move(current.id, current.index);
                    }}
                    onLostPointerCapture={() => {
                      drag.current = null;
                      setDragging(null);
                    }}
                    onPointerCancel={() => {
                      drag.current = null;
                      setDragging(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        drag.current = null;
                        setDragging(null);
                      }
                      if (
                        event.altKey &&
                        ["ArrowUp", "ArrowDown"].includes(event.key)
                      ) {
                        event.preventDefault();
                        void move(
                          task.id,
                          Math.max(
                            0,
                            Math.min(
                              visibleTasks.length - 1,
                              index + (event.key === "ArrowUp" ? -1 : 1),
                            ),
                          ),
                        );
                      }
                    }}
                  >
                    <Icon name="menu" size={18} />
                  </button>
                ) : undefined
              }
              checked={
                updating?.id === task.id ? updating.completed : task.completed
              }
              onToggle={toggle}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.emptyState}>{emptyMessage}</p>
      )}
    </section>
  );
}
