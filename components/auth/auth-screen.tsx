"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getDeviceTimezone } from "@/lib/timezone";
import { Icon } from "@/components/ui/icon";
import styles from "./auth.module.css";

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signingUp = mode === "sign-up";
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    try {
      const result = signingUp
        ? await authClient.signUp.email({ name: String(data.get("name")).trim(), email, password, timezone: getDeviceTimezone() })
        : await authClient.signIn.email({ email, password, rememberMe: data.get("remember") === "on" });
      if (result.error) {
        setError(result.error.status === 503
          ? "We’re having trouble connecting. Please try again shortly."
          : result.error.message || "Something went wrong. Please try again.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to connect. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <aside className={styles.story} aria-label="About Tasklist 2">
        <Link href="/" className={styles.brand}><span className={styles.logo}>T</span>Tasklist 2</Link>
        <div className={styles.storyContent}>
          <span className={styles.eyebrow}><span /> A LITTLE SPACE TO FOCUS</span>
          <h1>Small steps.<br />Real progress.</h1>
          <p>A clearer mind starts with a simpler plan.<br />Make room for what matters, one task at a time.</p>
          <div className={styles.preview}>
            <div className={styles.previewHeading}><span>Your daily focus</span><Icon name="more" /></div>
            <div className={styles.previewTask}><span className={styles.checked}><Icon name="check" size={13} /></span><span className={styles.finished}>Make a little space</span></div>
            <div className={styles.previewTask}><span className={styles.checked}><Icon name="check" size={13} /></span><span className={styles.finished}>Start with one small thing</span></div>
            <div className={styles.previewTask}><span className={styles.emptyCheck} /><span>Keep moving forward</span><span className={styles.today}>Today</span></div>
            <div className={styles.progressLabel}><span>A little closer, every day</span><span>2 / 3</span></div>
            <div className={styles.progress}><span /></div>
          </div>
        </div>
        <p className={styles.storyFooter}>Your day, with room to breathe.</p>
      </aside>

      <section className={styles.formPanel} aria-labelledby="auth-heading">
        <div className={styles.switchPrompt}>
          <span>{signingUp ? "Already have an account?" : "New to Tasklist 2?"}</span>
          <Link href={signingUp ? "/sign-in" : "/sign-up"}>{signingUp ? "Sign in" : "Create an account"}<Icon name="arrow" size={15} /></Link>
        </div>
        <div className={styles.formContent}>
          {/* <div className={styles.formIcon}><Icon name={signingUp ? "plus" : "grid"} size={22} /></div> */}
          <h2 id="auth-heading">{signingUp ? "A fresh start." : "Welcome back."}</h2>
          <p className={styles.subtitle}>{signingUp ? "Create your account. Make space for a better day." : "A little focus. A little progress. A day that’s yours."}</p>
          <form onSubmit={handleSubmit} className={styles.form}>
            <fieldset disabled={pending}>
              {signingUp && <div className={styles.field}><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" placeholder="Your name" required maxLength={100} pattern=".*\S.*" /></div>}
              <div className={styles.field}><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <div className={styles.passwordWrap}>
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={signingUp ? "new-password" : "current-password"} placeholder={signingUp ? "Create a password" : "Enter your password"} required minLength={signingUp ? 8 : undefined} maxLength={128} aria-describedby={signingUp ? "password-hint" : undefined} />
                  <button className={styles.showPassword} type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg>
                  </button>
                </div>
                {signingUp && <span id="password-hint" className={styles.hint}>Use at least 8 characters.</span>}
              </div>
              {!signingUp && <label className={styles.remember}><input name="remember" type="checkbox" defaultChecked />Keep me signed in</label>}
              {error && <p role="alert" className={styles.error}>{error}</p>}
              <button className={styles.submit} type="submit" aria-busy={pending}>{pending ? "Just a moment…" : signingUp ? "Create account" : "Sign in"}{!pending && <Icon name="arrow" size={18} />}</button>
            </fieldset>
          </form>
          <p className={styles.formNote}>{signingUp ? "Less clutter. More clarity. Your own little workspace." : "Everything you need to pick up where you left off."}</p>
        </div>
        <footer className={styles.footer}><span>© {new Date().getFullYear()} Tasklist 2</span><span><span className={styles.statusDot} /> A calmer way to get things done</span></footer>
      </section>
    </main>
  );
}
