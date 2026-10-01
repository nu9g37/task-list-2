import type { TaskPriority, TaskStatus } from "@/models";

export interface OverviewUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  timezone: string;
}

export interface ApiTask {
  id: string;
  projectId: string | null;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  position: number;
}

interface ApiProject { id: string; name: string; color: string }
export interface OverviewResponse {
  timezone: string;
  date: string;
  asOf: string;
  summary: { totalTasks: number; todayTasks: number; overdueTasks: number; completedTasks: number };
}

export interface OverviewProject extends ApiProject {
  tasks: number;
  remaining: number;
  progress: number;
}
export interface OverviewTask {
  id: string;
  title: string;
  project: string;
  detail: string;
  priority: "High" | "Medium" | "Low" | "Done";
  completed: boolean;
}

export class OverviewRequestError extends Error {
  constructor(public status: number) {
    super(status === 401 ? "Sign in to view your workspace" : "Unable to load your workspace");
  }
}

function localDate(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function buildOverview(user: OverviewUser, overview: OverviewResponse, projects: ApiProject[], tasks: ApiTask[]) {
  let timezone = overview.timezone;
  // PostgreSQL supports aliases that may not be recognized by browser Intl.
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); } catch { timezone = "UTC"; }
  const date = localDate(overview.asOf, timezone);
  const time = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(value));
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const projectViews: OverviewProject[] = projects.map((project) => {
    const rows = tasks.filter((task) => task.projectId === project.id);
    const completed = rows.filter((task) => task.status === "DONE").length;
    return { ...project, tasks: rows.length, remaining: rows.length - completed, progress: rows.length ? Math.round(completed / rows.length * 100) : 0 };
  });
  const today = tasks.filter((task) => task.dueAt && localDate(task.dueAt, timezone) === date);
  const completedToday = today.filter((task) => task.status === "DONE").length;
  const todayViews: OverviewTask[] = today.map((task) => ({
    id: task.id,
    title: task.title,
    project: task.projectId ? projectNames.get(task.projectId) ?? "Project" : "Personal tasks",
    detail: task.status === "DONE" ? "Completed" : `Today, ${time(task.dueAt!)}`,
    priority: task.status === "DONE" ? "Done" : task.priority === "HIGH" ? "High" : task.priority === "MEDIUM" ? "Medium" : "Low",
    completed: task.status === "DONE",
  }));
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const weekStart = shiftDate(date, -((weekday + 6) % 7));
  const previousWeek = shiftDate(weekStart, -7);
  const completedBetween = (from: string, to: string) => tasks.filter((task) => task.status === "DONE" && task.completedAt && task.completedAt <= overview.asOf && localDate(task.completedAt, timezone) >= from && localDate(task.completedAt, timezone) < to).length;
  const completedThisWeek = completedBetween(weekStart, shiftDate(weekStart, 7));
  const weekDifference = completedThisWeek - completedBetween(previousWeek, weekStart);
  const upcoming = tasks.filter((task) => task.status !== "DONE" && task.dueAt && new Date(task.dueAt) >= new Date(overview.asOf)).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());
  const upcomingCount = upcoming.filter((task) => localDate(task.dueAt!, timezone) < shiftDate(date, 7)).length;
  const next = upcoming[0];
  const nextDate = next ? localDate(next.dueAt!, timezone) : null;
  const nextLabel = !next ? null : nextDate === date ? "Today" : nextDate === shiftDate(date, 1) ? "Tomorrow" : new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "short", day: "numeric" }).format(new Date(next.dueAt!));
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(new Date(overview.asOf)));
  return {
    user, timezone, date, summary: overview.summary, projects: projectViews, todayTasks: todayViews,
    greeting: hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening",
    displayDate: new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(overview.asOf)),
    completedThisWeek, weekDifference, upcomingCount,
    focus: { total: today.length, completed: completedToday, progress: today.length ? Math.round(completedToday / today.length * 100) : 0 },
    upcoming: next ? { title: next.title, project: next.projectId ? projectNames.get(next.projectId) ?? "Project" : "Personal tasks", label: `${nextLabel}, ${time(next.dueAt!)}` } : null,
  };
}

export type OverviewData = ReturnType<typeof buildOverview>;

export async function loadOverview(signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<OverviewData> {
  async function get<T>(path: string): Promise<T> {
    const response = await fetcher(path, { credentials: "same-origin", cache: "no-store", signal });
    if (!response.ok) throw new OverviewRequestError(response.status);
    return response.json();
  }
  const [me, overview, projects, tasks] = await Promise.all([
    get<{ user: OverviewUser }>("/api/me"),
    get<OverviewResponse>("/api/overview"),
    get<{ projects: ApiProject[] }>("/api/projects"),
    get<{ tasks: ApiTask[] }>("/api/tasks"),
  ]);
  return buildOverview(me.user, overview, projects.projects, tasks.tasks);
}
