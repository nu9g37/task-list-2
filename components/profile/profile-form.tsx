"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { isValidTimezone, timezoneOptions } from "@/lib/timezone";
import type { OverviewUser } from "@/components/overview/overview-data";
import styles from "@/components/tasks/task-form.module.css";
import profileStyles from "./profile.module.css";
import { PasswordForm } from "./password-form";
import { readProfileImage } from "./profile-image";

export function ProfileForm({ user, onClose, onSaved }: { user: OverviewUser; onClose: () => void; onSaved: (user: OverviewUser) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const readingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState(user.image ?? "");
  const [failedImage, setFailedImage] = useState<string>();
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [timezone, setTimezone] = useState(isValidTimezone(user.timezone) ? user.timezone : "UTC");
  const [zones] = useState(() => timezoneOptions(user.timezone));
  const busy = saving || loggingOut || passwordBusy || readingImage;
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    if (!savingRef.current && !readingRef.current) onClose();
  }

  async function logout() {
    if (savingRef.current || readingRef.current) return;
    savingRef.current = true;
    setLoggingOut(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(result.error.message || "Could not log out. Please try again.");
      } else {
        window.location.replace("/sign-in");
        return;
      }
    } catch {
      setError("Could not connect. Check your connection and try again.");
    }
    savingRef.current = false;
    setLoggingOut(false);
  }

  async function changeImage(file?: File) {
    if (!file || savingRef.current || readingRef.current) return;
    readingRef.current = true;
    setReadingImage(true);
    setImageError("");
    try {
      setImage(await readProfileImage(file));
      setFailedImage(undefined);
    } catch (failure) {
      setImageError(failure instanceof Error ? failure.message : "Could not read this image.");
    } finally {
      readingRef.current = false;
      setReadingImage(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || readingRef.current) return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) { setError("Please enter your name."); return; }
    if (!isValidTimezone(timezone)) { setError("Please select a valid timezone."); return; }
    const imageUrl = image.trim();
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const result = await authClient.updateUser({ name, image: imageUrl || null, timezone });
      if (result.error) {
        setError(result.error.status === 401 ? "Your session has ended. Please sign in again." : result.error.message || "Could not save your profile. Please try again.");
        return;
      }
      onSaved({ ...user, name, image: imageUrl || null, timezone });
      onClose();
    } catch {
      setError("Could not connect. Check your connection and try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <dialog ref={dialogRef} className={styles.dialog} onClose={close} onCancel={(event) => { if (savingRef.current || readingRef.current) event.preventDefault(); }} aria-labelledby="profile-heading" aria-describedby="profile-description">
    <div className={styles.content}>
      <div className={styles.header}><h2 id="profile-heading">Your profile</h2><button type="button" className={styles.close} onClick={close} disabled={busy} aria-label="Close profile">×</button></div>
      <p id="profile-description" className={styles.intro}>Your personal workspace details.</p>
      <form id="profile-details" onSubmit={submit} />
        <fieldset disabled={busy}>
          <div className={profileStyles.photo}>
            <div className={profileStyles.avatar}>
              {/* Uploaded avatars and existing URLs do not need the image optimization proxy. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image.trim() && failedImage !== image.trim() ? <img src={image.trim()} alt="Profile" referrerPolicy="no-referrer" onError={() => setFailedImage(image.trim())} /> : <span aria-label="Profile initials">{initials}</span>}
            </div>
            <input ref={fileRef} id="profile-image" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void changeImage(file); }} />
            <button type="button" className={profileStyles.changeImage} onClick={() => fileRef.current?.click()} aria-label="Change profile image">{readingImage ? "Preparing…" : "Change"}</button>
            <small className={profileStyles.imageHint}>JPG, PNG or WebP · Up to 5 MB</small>
            {imageError && <p role="alert" className={styles.error}>{imageError}</p>}
          </div>
          <div className={styles.field}><label htmlFor="profile-name">Name <span>*</span></label><input form="profile-details" id="profile-name" name="name" defaultValue={user.name} autoComplete="name" required maxLength={200} autoFocus /></div>
          <div className={styles.field}><label htmlFor="profile-email">Email <small>Read only</small></label><input id="profile-email" type="email" value={user.email} readOnly /></div>
        </fieldset>
        <PasswordForm disabled={busy} onBusy={(value) => { savingRef.current = value; setPasswordBusy(value); }} />
        <fieldset disabled={busy}>
          <div className={styles.field}>
            <label htmlFor="profile-timezone">Timezone</label>
            <select form="profile-details" id="profile-timezone" name="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} aria-describedby="timezone-hint" required>
              {zones.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
            </select>
            <small id="timezone-hint">UTC offsets shown are current. Daylight saving adjusts automatically.</small>
          </div>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={`${styles.footer} ${profileStyles.footer}`}>
            <button type="button" className={profileStyles.logout} onClick={logout}>{loggingOut ? "Logging out…" : "Logout"}</button>
            <button type="button" className={styles.cancel} onClick={close}>Cancel</button>
            <button form="profile-details" type="submit" className={styles.submit}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </fieldset>
    </div>
  </dialog>;
}
