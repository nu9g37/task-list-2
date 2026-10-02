"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { taskDateTime, taskDueAt } from "@/lib/timezone";
import type {
  ApiTask,
  OverviewProject,
} from "@/components/overview/overview-data";
import styles from "./task-form.module.css";

interface TaskFormProps {
  timezone: string;
  defaultProjectId?: string;
  defaultDate?: string;
  task?: ApiTask;
  open: boolean;
  projects: OverviewProject[];
  onClose: () => void;
  onCreated: () => void;
}

export function TaskForm({
  open,
  projects,
  onClose,
  onCreated,
  task,
  defaultProjectId,
  defaultDate,
  timezone,
}: TaskFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const localDue = task?.dueAt ? taskDateTime(task.dueAt, timezone) : null;
  const initialDate = task ? (localDue?.date ?? "") : (defaultDate ?? "");
  const initialTime = localDue?.time ?? "09:00";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    if (saving) return;
    setError("");
    formRef.current?.reset();
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title") ?? "").trim();
    if (!title) {
      setError("Please enter a task name.");
      return;
    }
    const dueDate = String(values.get("dueDate") ?? "");
    const dueTime = String(values.get("dueTime") || "09:00");
    const due = dueDate ? taskDueAt(dueDate, dueTime, timezone) : null;
    if (dueDate && !due) {
      setError(
        "Please enter a valid due date and time in your profile timezone. This time may be skipped by daylight saving.",
      );
      return;
    }
    const dueAt =
      task && dueDate === initialDate && dueTime === initialTime
        ? task.dueAt
        : due;
    setSaving(true);
    try {
      const response = await fetch(
        task ? `/api/tasks/${encodeURIComponent(task.id)}` : "/api/tasks",
        {
          method: task ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            title,
            description: String(values.get("description") ?? "").trim() || null,
            projectId: String(values.get("projectId") ?? "") || null,
            priority: String(values.get("priority") ?? "MEDIUM"),
            dueAt,
          }),
        },
      );
      if (!response.ok) {
        const result: { error?: string } = await response
          .json()
          .catch(() => ({}));
        setError(
          response.status === 401
            ? "Your session has ended. Please sign in again."
            : result.error || "Could not save the task. Please try again.",
        );
        return;
      }
      formRef.current?.reset();
      onClose();
      onCreated();
    } catch {
      setError("Could not connect. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={close}
      onCancel={(event) => {
        if (saving) event.preventDefault();
      }}
      aria-labelledby="task-form-heading"
      aria-describedby="task-form-description"
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 id="task-form-heading">{task ? "Edit task" : "Create a task"}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={close}
            disabled={saving}
            aria-label="Close task form"
          >
            ×
          </button>
        </div>
        <p id="task-form-description" className={styles.intro}>
          Give it a name, then make a little room to get it done.
        </p>
        <form ref={formRef} onSubmit={submit}>
          <fieldset disabled={saving}>
            <div className={styles.field}>
              <label htmlFor="task-title">
                Task name <span>*</span>
              </label>
              <input
                id="task-title"
                name="title"
                type="text"
                defaultValue={task?.title}
                placeholder="What needs to be done?"
                required
                maxLength={200}
                autoFocus
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="task-description">
                Description <small>Optional</small>
              </label>
              <textarea
                id="task-description"
                name="description"
                defaultValue={task?.description ?? ""}
                placeholder="Add a few details to remember later..."
                rows={3}
                maxLength={10000}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="task-project">Project</label>
              <select
                id="task-project"
                name="projectId"
                defaultValue={
                  task ? (task.projectId ?? "") : (defaultProjectId ?? "")
                }
              >
                <option value="">Personal tasks</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="task-date">
                  Due date <small>Optional</small>
                </label>
                <input
                  id="task-date"
                  name="dueDate"
                  type="date"
                  defaultValue={initialDate}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="task-time">Time</label>
                <input
                  id="task-time"
                  name="dueTime"
                  type="time"
                  defaultValue={initialTime}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                name="priority"
                defaultValue={task?.priority ?? "MEDIUM"}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.footer}>
              <button type="button" className={styles.cancel} onClick={close}>
                Cancel
              </button>
              <button type="submit" className={styles.submit}>
                {saving ? "Saving…" : task ? "Save changes" : "Create task"}
                <Icon name="arrow" size={16} />
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </dialog>
  );
}
