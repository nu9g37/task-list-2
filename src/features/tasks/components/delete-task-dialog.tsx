"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./task-form.module.css";

export function DeleteTaskDialog({
  task,
  onClose,
  onDeleted,
}: {
  task: { id: string; title: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  async function remove() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/tasks/${encodeURIComponent(task.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session has ended. Please sign in again."
            : "Could not delete the task. Please try again.",
        );
      onClose();
      onDeleted();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not connect. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="delete-task-heading"
      aria-describedby="delete-task-description"
      onClose={onClose}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 id="delete-task-heading">Delete task?</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close confirmation"
            disabled={pending}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p id="delete-task-description" className={styles.intro}>
          “{task.title}” will be permanently deleted. This cannot be undone.
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancel}
            disabled={pending}
            onClick={onClose}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.submit} ${styles.danger}`}
            disabled={pending}
            onClick={remove}
          >
            {pending ? "Deleting…" : "Delete task"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
