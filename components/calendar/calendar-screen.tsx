"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/layout/workspace-layout";
import { loadOverview, OverviewRequestError, type OverviewData } from "@/components/overview/overview-data";
import { TaskForm } from "@/components/tasks/task-form";
import { Icon } from "@/components/ui/icon";
import { calendarTasks, formatDay, shiftMonth, shiftDay, type CalendarTask } from "./calendar-data";
import { CalendarGrid } from "./calendar-grid";
import { DayPanel } from "./day-panel";
import styles from "./calendar.module.css";

export function CalendarScreen() {
  const router = useRouter();
  const { publish, revision } = useWorkspace();
  const [data, setData] = useState<OverviewData>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [month, setMonth] = useState<string>();
  const [selection, setSelection] = useState<string>();
  const [view, setView] = useState<"Month" | "Week" | "Agenda">("Month");
  const [creating, setCreating] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [updating, setUpdating] = useState(false);
  const mutationInFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    loadOverview(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setData(result); publish(result); setError("");
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      if (failure instanceof OverviewRequestError && failure.status === 401) { router.replace("/sign-in"); return; }
      setError("Unable to load your calendar. Please try again.");
    });
    return () => controller.abort();
  }, [publish, revision, attempt, router]);

  async function toggle(task: CalendarTask) {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setUpdating(true);
    setMutationError("");
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.source.id)}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: task.source.status === "DONE" ? "TODO" : "DONE" }) });
      if (response.status === 401) { router.replace("/sign-in"); return; }
      if (!response.ok) throw new Error();
      const result = await loadOverview(); setData(result); publish(result);
    } catch (failure) {
      if (failure instanceof OverviewRequestError && failure.status === 401) router.replace("/sign-in");
      else setMutationError("Could not update the task. Please try again.");
    } finally {
      mutationInFlight.current = false;
      setUpdating(false);
    }
  }

  if (error) return <section className={styles.empty} role="alert"><p>{error}</p><button className={styles.todayButton} onClick={() => setAttempt((value) => value + 1)}>Try again</button></section>;
  if (!data) return <p className={styles.empty} role="status">Loading your calendar…</p>;
  const displayedMonth = month ?? data.date.slice(0, 7);
  const selectedDay = selection ?? data.date;
  const tasks = calendarTasks(data);
  const today = tasks.filter((task) => task.day === data.date);
  function navigate(amount: number) {
    if (view === "Week") { const day = shiftDay(selectedDay, amount * 7); setSelection(day); setMonth(day.slice(0, 7)); }
    else { const target = shiftMonth(displayedMonth, amount); setMonth(target); setSelection(`${target}-01`); }
  }
  return <><section className={styles.heading}><div><h1>Calendar</h1><p>A little planning goes a long way.</p></div><button className={styles.newTask} onClick={() => setCreating(true)}><Icon name="plus" size={14} />New task</button></section><div className={styles.todaySummary}><span><span className={styles.dot} />Today: {formatDay(data.date, { month: "long", day: "numeric" })}</span><span>{today.length} tasks · {today.filter((task) => task.source.status !== "DONE").length} remaining</span></div><div className={styles.calendarLayout}><section className={styles.calendarPanel} aria-label="Task calendar"><div className={styles.toolbar}><h2>{formatDay(`${displayedMonth}-01`, { month: "long", year: "numeric" })}</h2><div className={styles.monthArrows}><button aria-label="Previous period" onClick={() => navigate(-1)}><span className={styles.previous}><Icon name="right" /></span></button><button aria-label="Next period" onClick={() => navigate(1)}><Icon name="right" /></button></div><button className={styles.todayButton} onClick={() => { setMonth(data.date.slice(0, 7)); setSelection(data.date); }}>Today</button><div className={styles.viewTabs} aria-label="Calendar view">{(["Month", "Week", "Agenda"] as const).map((name) => <button key={name} aria-pressed={view === name} className={view === name ? styles.activeView : ""} onClick={() => setView(name)}>{name}</button>)}</div></div><CalendarGrid month={displayedMonth} selectedDay={selectedDay} today={data.date} tasks={tasks} view={view} onSelect={setSelection} /></section><DayPanel day={selectedDay} tasks={tasks} data={data} error={mutationError} updating={updating} onToggle={toggle} /></div>{creating && <TaskForm open projects={data.projects} onClose={() => setCreating(false)} onCreated={() => setAttempt((value) => value + 1)} />}</>;
}
