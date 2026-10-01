import type { OverviewData, ApiTask } from "@/components/overview/overview-data";

export function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function localDay(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatDay(day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

export function shiftMonth(month: string, amount: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

export function weekDays(day: string) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const monday = shiftDay(day, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => shiftDay(monday, index));
}

export function monthDays(month: string) {
  const start = weekDays(`${month}-01`)[0];
  const last = shiftDay(`${shiftMonth(month, 1)}-01`, -1);
  const end = weekDays(last)[6];
  const days: string[] = [];
  for (let day = start; day <= end; day = shiftDay(day, 1)) days.push(day);
  return days;
}

export interface CalendarTask { source: ApiTask; day: string; time: string; project: string; color: string }

export function calendarTasks(data: OverviewData): CalendarTask[] {
  const projects = new Map(data.projects.map((project) => [project.id, project]));
  return data.tasks.map((task) => task.source).filter((task) => task.dueAt).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()).map((task) => ({
    source: task,
    day: localDay(task.dueAt!, data.timezone),
    time: new Intl.DateTimeFormat("en-US", { timeZone: data.timezone, hour: "numeric", minute: "2-digit" }).format(new Date(task.dueAt!)),
    project: task.projectId ? projects.get(task.projectId)?.name ?? "Project" : "Personal tasks",
    color: task.projectId ? projects.get(task.projectId)?.color ?? "#245C45" : "#245C45",
  }));
}
