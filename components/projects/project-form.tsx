"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "@/components/tasks/task-form.module.css";
import colorStyles from "./project-form.module.css";

const colors = [
  { name: "Forest", value: "#245C45" },
  { name: "Lavender", value: "#9280C5" },
  { name: "Blue", value: "#6D95C8" },
  { name: "Orange", value: "#DA8945" },
  { name: "Rose", value: "#C97885" },
] as const;

export function ProjectForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [color, setColor] = useState<string>(colors[0].value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) { setError("Please enter a project name."); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: String(data.get("description") ?? "").trim() || null, color }),
      });
      if (!response.ok) {
        const result: { error?: string } = await response.json().catch(() => ({}));
        throw new Error(response.status === 401 ? "Your session has ended. Please sign in again." : result.error || "Could not create the project. Please try again.");
      }
      onClose();
      onCreated();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not connect. Please try again.");
      setSaving(false);
    }
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="project-form-heading" aria-describedby="project-form-description" onClose={onClose} onCancel={(event) => { if (saving) event.preventDefault(); }}>
    <div className={styles.content}>
      <div className={styles.header}><h2 id="project-form-heading">Create a project</h2><button type="button" className={styles.close} disabled={saving} aria-label="Close project form" onClick={onClose}>×</button></div>
      <p id="project-form-description" className={styles.intro}>A little space to bring your tasks together.</p>
      <form onSubmit={submit}>
        <fieldset disabled={saving}>
          <div className={styles.field}><label htmlFor="project-name">Project name <span>*</span></label><input id="project-name" name="name" placeholder="Give your project a name" required maxLength={200} autoFocus /></div>
          <div className={styles.field}><label htmlFor="project-description">Description <small>Optional</small></label><textarea id="project-description" name="description" placeholder="What is this project about?" rows={3} maxLength={10000} /></div>
          <div className={styles.field}>
            <span id="project-color-label" className={colorStyles.label}>Project color</span>
            <div className={colorStyles.colors} role="group" aria-labelledby="project-color-label">
              {colors.map((item) => <button key={item.value} type="button" className={colorStyles.swatch} style={{ background: item.value }} aria-label={item.name} aria-pressed={color === item.value} onClick={() => setColor(item.value)}>{color === item.value && <Icon name="check" size={17} />}</button>)}
            </div>
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.footer}><button type="button" className={styles.cancel} onClick={onClose}>Cancel</button><button type="submit" className={styles.submit}>{saving ? "Creating…" : "Create project"}<Icon name="arrow" size={16} /></button></div>
        </fieldset>
      </form>
    </div>
  </dialog>;
}
