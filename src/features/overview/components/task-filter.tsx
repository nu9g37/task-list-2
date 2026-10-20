"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "./task-filter.module.css";

type PriorityFilter = "High" | "Medium" | "Low";

type TaskSort = "default" | "dueDate" | "priority" | "title";

export interface TaskFilterValue {
  priorities: PriorityFilter[];
  sortBy: TaskSort;
}

export const EMPTY_TASK_FILTER: TaskFilterValue = {
  priorities: [],
  sortBy: "default",
};

const SORT_OPTIONS: { id: TaskSort; label: string }[] = [
  { id: "default", label: "Default order" },
  { id: "dueDate", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "title", label: "Title (A-Z)" },
];

const PRIORITIES: PriorityFilter[] = ["High", "Medium", "Low"];

function toggleItem<T>(items: T[], item: T) {
  return items.includes(item)
    ? items.filter((value) => value !== item)
    : [...items, item];
}

export function TaskFilter({
  value,
  disabled = false,
  onApply,
}: {
  value: TaskFilterValue;
  disabled?: boolean;
  onApply: (value: TaskFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TaskFilterValue>(value);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const activeCount =
    value.priorities.length + (value.sortBy !== "default" ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggleOpen() {
    if (!open) setDraft(value);
    setOpen(!open);
  }

  function apply(next: TaskFilterValue) {
    onApply(next);
    setOpen(false);
  }

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        className={`${styles.trigger} ${activeCount ? styles.triggerActive : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        onClick={toggleOpen}
      >
        <Icon name="filter" size={15} />
        Filter
        {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filter tasks"
          className={styles.panel}
        >
          <fieldset className={styles.group}>
            <legend>Priority</legend>
            <div className={styles.chips}>
              {PRIORITIES.map((priority) => {
                const selected = draft.priorities.includes(priority);
                return (
                  <button
                    key={priority}
                    type="button"
                    aria-pressed={selected}
                    className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        priorities: toggleItem(draft.priorities, priority),
                      })
                    }
                  >
                    {priority}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset className={styles.group}>
            <legend>Sort by</legend>
            <div className={styles.chips}>
              {SORT_OPTIONS.map((option) => {
                const selected = draft.sortBy === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
                    onClick={() => setDraft({ ...draft, sortBy: option.id })}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.clear}
              onClick={() => {
                setDraft(EMPTY_TASK_FILTER);
                apply(EMPTY_TASK_FILTER);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className={styles.apply}
              onClick={() => apply(draft)}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
