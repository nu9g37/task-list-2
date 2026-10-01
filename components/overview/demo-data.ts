export const demoUser = { name: "Alex Kim", initials: "AK", workspace: "Personal workspace" };
export const demoProjects = [
  { id: "website", name: "Website redesign", tasks: 12, remaining: 4, progress: 67, color: "var(--purple)" },
  { id: "personal", name: "Personal goals", tasks: 8, remaining: 4, progress: 50, color: "var(--green)" },
  { id: "mobile", name: "Mobile app", tasks: 6, remaining: 4, progress: 33, color: "var(--blue)" },
] as const;
export const demoTasks = [
  { id: "homepage", title: "Define the homepage structure", project: "Website redesign", detail: "Today, 10:00 AM", priority: "High", completed: false },
  { id: "palette", title: "Review the new color palette", project: "Website redesign", detail: "Today, 11:30 AM", priority: "Medium", completed: false },
  { id: "reading", title: "Read 20 pages", project: "Personal goals", detail: "Today, 12:00 PM", priority: "Low", completed: false },
  { id: "onboarding", title: "Sketch the onboarding flow", project: "Mobile app", detail: "Today, 2:00 PM", priority: "High", completed: false },
  { id: "planning", title: "Plan the week ahead", project: "Personal goals", detail: "Completed", priority: "Done", completed: true },
] as const;
export type OverviewProject = (typeof demoProjects)[number];
export type OverviewTask = (typeof demoTasks)[number];
