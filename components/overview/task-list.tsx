"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { OverviewTask } from "./overview-data";
import styles from "./overview.module.css";

function TaskRow({
  task,
  pending,
  checked,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: OverviewTask;
  pending: boolean;
  checked: boolean;
  onToggle: (task: OverviewTask, checked: boolean) => void;
  onEdit: (task: OverviewTask) => void;
  onDelete: (task: OverviewTask) => void;
}) {
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuOffset = useRef({ top: 0, left: 0 });
  const [position, setPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    function followTask() {
      const menu = menuRef.current;
      if (!menu?.matches(":popover-open") || !triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      menu.style.top = `${rect.top + menuOffset.current.top}px`;
      menu.style.left = `${rect.left + menuOffset.current.left}px`;
    }
    // Capture scrolls from both the workspace and the task list itself.
    window.addEventListener("scroll", followTask, true);
    window.addEventListener("resize", followTask);
    return () => {
      window.removeEventListener("scroll", followTask, true);
      window.removeEventListener("resize", followTask);
    };
  }, []);
  return (
    <li className={`${styles.taskRow} ${checked ? styles.completedRow : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(event) => onToggle(task, event.target.checked)}
        aria-label={`${checked ? "Reopen" : "Complete"} ${task.title}`}
      />
      <div className={styles.taskCopy}>
        <p>{task.title}</p>
        <span>
          {task.project} · {task.detail}
        </span>
      </div>
      <span className={`${styles.badge} ${styles[`priority${task.priority}`]}`}>
        {task.priority}
      </span>
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        popoverTarget={menuId}
        className={styles.iconButton}
        aria-label={`More options for ${task.title}`}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const nextPosition = {
            top:
              rect.bottom + 5 + 90 > window.innerHeight
                ? rect.top - 95
                : rect.bottom + 5,
            left: Math.max(8, rect.right - 136),
          };
          menuOffset.current = {
            top: nextPosition.top - rect.top,
            left: nextPosition.left - rect.left,
          };
          setPosition(nextPosition);
          if (menuRef.current) {
            menuRef.current.style.top = `${nextPosition.top}px`;
            menuRef.current.style.left = `${nextPosition.left}px`;
          }
        }}
      >
        <Icon name="more" size={16} />
      </button>
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        className={styles.taskMenu}
        style={position}
      >
        <button
          type="button"
          onClick={() => {
            menuRef.current?.hidePopover();
            onEdit(task);
          }}
        >
          Edit
        </button>
        <button
          type="button"
          className={styles.deleteMenuItem}
          onClick={() => {
            menuRef.current?.hidePopover();
            onDelete(task);
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
export function TaskList({
  tasks,
  searching = false,
  onAddTask,
  onStatusChange,
  onEditTask,
  onDeleteTask,
}: {
  tasks: OverviewTask[];
  searching?: boolean;
  onAddTask: () => void;
  onStatusChange: (id: string, completed: boolean) => Promise<void>;
  onEditTask: (task: OverviewTask) => void;
  onDeleteTask: (task: OverviewTask) => void;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "today" | "done">("all");
  const [updating, setUpdating] = useState<{
    id: string;
    completed: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  async function toggle(task: OverviewTask, completed: boolean) {
    if (updating) return;
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
  const visibleTasks = tasks.filter(
    (task) =>
      activeTab === "all" ||
      (activeTab === "today" ? task.dueToday : task.completed),
  );
  const emptyMessage = searching
    ? "No tasks match your search in this view."
    : activeTab === "today"
      ? "No tasks due today. Enjoy a little breathing room."
      : activeTab === "done"
        ? "No completed tasks yet. One small step at a time."
        : "No tasks yet. Add your first task to get started.";

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
      {visibleTasks.length ? (
        <ul className={styles.tasks}>
          {visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              pending={!!updating}
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
