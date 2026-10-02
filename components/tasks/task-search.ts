import { buildOverview, type OverviewData } from "../overview/overview-data";

// Plain text means contains; leading/trailing % select LIKE-style matching.
export function matchesTaskSearch(
  task: { title: string; description: string | null },
  query: string,
) {
  const pattern = query.trim().toLowerCase();
  if (!pattern) return true;
  const leading = pattern.startsWith("%");
  const trailing = pattern.endsWith("%");
  const term = pattern.replace(/^%+|%+$/g, "");
  return [task.title, task.description ?? ""].some((text) => {
    const value = text.toLowerCase();
    if (leading && !trailing) return value.endsWith(term);
    if (trailing && !leading) return value.startsWith(term);
    return value.includes(term);
  });
}

export function searchOverview(
  data: OverviewData,
  query: string,
): OverviewData {
  if (!query.trim()) return data;
  const tasks = data.tasks
    .filter((task) => matchesTaskSearch(task.source, query))
    .map((task) => task.source);
  const filtered = buildOverview(
    data.user,
    {
      timezone: data.timezone,
      date: data.date,
      asOf: data.asOf,
      summary: data.summary,
    },
    data.projects,
    tasks,
  );
  return {
    ...filtered,
    projects: data.projects,
    currentProject: data.currentProject,
    summary: {
      totalTasks: tasks.length,
      todayTasks: filtered.todayTasks.filter((task) => !task.completed).length,
      overdueTasks: tasks.filter(
        (task) =>
          task.status !== "DONE" &&
          task.dueAt &&
          new Date(task.dueAt) < new Date(data.asOf),
      ).length,
      completedTasks: tasks.filter((task) => task.status === "DONE").length,
    },
  };
}
