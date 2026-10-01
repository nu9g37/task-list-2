import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@/models";
import { ApiError } from "@/server/api";
import { parseArchiveFilter } from "@/server/projects/validation";

export interface TaskInput {
  title?: string;
  description?: string | null;
  projectId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: Date | null;
  position?: number;
}

/** Require an explicit timezone and reject invalid calendar dates before Date normalizes them. */
function timestamp(value: unknown, field: string): Date {
  const match = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) throw new ApiError(400, `${field} must be an ISO datetime with timezone`);
  const [, year, month, day, hour, minute, second, , offsetHour, offsetMinute] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > days[m - 1] || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || Number(offsetHour ?? 0) > 23 || Number(offsetMinute ?? 0) > 59) {
    throw new ApiError(400, `${field} contains an invalid date or time`);
  }
  const date = new Date(value as string);
  if (!Number.isFinite(date.getTime())) throw new ApiError(400, `${field} contains an invalid date or time`);
  return date;
}

function projectId(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new ApiError(400, "projectId must be a non-empty string up to 200 characters or null");
  return value.trim();
}

export function parseTaskInput(body: Record<string, unknown>, update = false): TaskInput {
  const allowed = ["title", "description", "projectId", "status", "priority", "dueAt", "position"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new ApiError(400, "Unsupported task field");
  if (update && !Object.keys(body).length) throw new ApiError(400, "No fields to update");
  const input: TaskInput = {};
  if (!update || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200) throw new ApiError(400, "title must contain 1–200 characters");
    input.title = body.title.trim();
  }
  if (Object.hasOwn(body, "description")) {
    if (body.description !== null && (typeof body.description !== "string" || body.description.length > 10_000)) throw new ApiError(400, "description must be a string up to 10000 characters or null");
    input.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (Object.hasOwn(body, "projectId")) input.projectId = projectId(body.projectId);
  if (Object.hasOwn(body, "status")) {
    if (!TASK_STATUSES.includes(body.status as TaskStatus)) throw new ApiError(400, "status must be TODO or DONE");
    input.status = body.status as TaskStatus;
  }
  if (Object.hasOwn(body, "priority")) {
    if (!TASK_PRIORITIES.includes(body.priority as TaskPriority)) throw new ApiError(400, "priority must be LOW, MEDIUM or HIGH");
    input.priority = body.priority as TaskPriority;
  }
  if (Object.hasOwn(body, "dueAt")) input.dueAt = body.dueAt === null ? null : timestamp(body.dueAt, "dueAt");
  if (Object.hasOwn(body, "position")) {
    if (typeof body.position !== "number" || !Number.isInteger(body.position) || body.position < 0 || body.position > 2_147_483_647) throw new ApiError(400, "position must be a non-negative PostgreSQL integer");
    input.position = body.position;
  }
  return input;
}

export interface TaskFilters {
  projectId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueFrom?: Date;
  dueTo?: Date;
  archived: "active" | "archived" | "all";
}

export function parseTaskFilters(request: Request): TaskFilters {
  const params = new URL(request.url).searchParams;
  const filters: TaskFilters = { archived: parseArchiveFilter(request) };
  if (params.has("projectId")) filters.projectId = projectId(params.get("projectId") === "null" ? null : params.get("projectId"));
  for (const key of ["status", "priority"] as const) {
    if (params.has(key)) Object.assign(filters, { [key]: parseTaskInput({ [key]: params.get(key) }, true)[key] });
  }
  for (const key of ["dueFrom", "dueTo"] as const) {
    if (params.has(key)) filters[key] = timestamp(params.get(key), key);
  }
  if (filters.dueFrom && filters.dueTo && filters.dueFrom >= filters.dueTo) throw new ApiError(400, "dueFrom must be before dueTo");
  return filters;
}
