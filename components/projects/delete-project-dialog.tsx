"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/components/tasks/task-form.module.css";

export function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: { id: string; name: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  function close() {
    if (!inFlight.current) onClose();
  }
  async function remove() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          response.status === 401
            ? "Your session has ended. Please sign in again."
            : result.error || "Could not delete the project. Please try again.",
        );
      }
      onClose();
      onDeleted();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not connect. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="delete-project-heading"
      aria-describedby="delete-project-description"
      onClose={close}
      onCancel={(event) => {
        if (inFlight.current) event.preventDefault();
      }}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 id="delete-project-heading">Delete project?</h2>
          <button
            type="button"
            className={styles.close}
            disabled={pending}
            onClick={close}
            aria-label="Close confirmation"
          >
            ×
          </button>
        </div>
        <p id="delete-project-description" className={styles.intro}>
          “{project.name}” will be permanently deleted. Move or delete its tasks
          first. This cannot be undone.
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
            onClick={close}
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
            {pending ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
