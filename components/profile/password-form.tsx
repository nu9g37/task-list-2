"use client";

import { useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "@/components/tasks/task-form.module.css";
import profileStyles from "./profile.module.css";

export function PasswordForm({
  disabled,
  onBusy,
}: {
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || disabled) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const currentPassword = String(values.get("currentPassword") ?? "");
    const newPassword = String(values.get("newPassword") ?? "");
    setSuccess(false);
    setError("");
    if (newPassword !== values.get("confirmPassword")) {
      setError("New passwords do not match.");
      return;
    }
    pending.current = true;
    setSaving(true);
    onBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (result.error) {
        setError(
          result.error.message ||
            "Could not change your password. Please try again.",
        );
        return;
      }
      form.reset();
      setSuccess(true);
    } catch {
      setError("Could not connect. Check your connection and try again.");
    } finally {
      pending.current = false;
      setSaving(false);
      onBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className={profileStyles.password}
      aria-label="Change password"
    >
      {/* <h3 id="password-heading">Password</h3> */}
      <fieldset disabled={disabled}>
        <div className={styles.field}>
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {success && (
          <p role="status" className={profileStyles.success}>
            Password updated.
          </p>
        )}
        <div className={`${styles.footer} ${profileStyles.passwordActions}`}>
          <button
            type="submit"
            className={`${styles.submit} ${profileStyles.passwordButton}`}
          >
            {saving ? "Updating…" : "Change password"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
