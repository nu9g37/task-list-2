import type { Project } from "./project";
import type { User } from "./user";

export const TASK_STATUSES = ["TODO", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: string;
  userId: User["id"];
  /** Null means a personal task without a project. */
  projectId: Project["id"] | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** Deadline date AND time; null means unscheduled. Display in User.timezone. */
  dueAt: Date | null;
  /** Set when status is DONE; clear when reopening the task. */
  completedAt: Date | null;
  /** Order within the project or personal task list. */
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
