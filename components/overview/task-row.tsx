import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import type { OverviewTask } from "./overview-data";
import styles from "./overview.module.css";

export function TaskRow({
  task,
  pending,
  checked,
  onToggle,
  onEdit,
  onDelete,
  reorderHandle,
  orderClassName = "",
}: {
  task: OverviewTask;
  pending: boolean;
  checked: boolean;
  onToggle: (task: OverviewTask, checked: boolean) => void;
  onEdit: (task: OverviewTask) => void;
  onDelete: (task: OverviewTask) => void;
  reorderHandle?: ReactNode;
  orderClassName?: string;
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
    <li
      data-task-id={task.id}
      className={`${styles.taskRow} ${reorderHandle ? styles.reorderableTask : ""} ${checked ? styles.completedRow : ""} ${orderClassName}`}
    >
      {reorderHandle}
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
          disabled={pending}
          onClick={() => {
            menuRef.current?.hidePopover();
            onEdit(task);
          }}
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
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
