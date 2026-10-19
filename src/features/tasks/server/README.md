# Task API

All routes use the Better Auth session cookie and only access the signed-in user's tasks.
Mutations also require an `Origin` header matching `BETTER_AUTH_URL` (including in Postman).
POST/PATCH require `Content-Type: application/json`.

| Method | Route            | Successful response                              |
| ------ | ---------------- | ------------------------------------------------ |
| GET    | `/api/tasks`     | 200 `{ "tasks": [...] }`                         |
| POST   | `/api/tasks`     | 201 `{ "task": {...} }`                          |
| GET    | `/api/tasks/:id` | 200 `{ "task": {...} }`                          |
| PATCH  | `/api/tasks/:id` | 200 `{ "task": {...} }`                          |
| DELETE | `/api/tasks/:id` | 200 `{ "message": "Task deleted successfully" }` |

## Create and update

```json
{
  "title": "Build Task API",
  "description": "Implement CRUD endpoints",
  "projectId": "your-project-id",
  "status": "TODO",
  "priority": "HIGH",
  "dueAt": "2026-10-01T18:00:00+07:00"
}
```

Only `title` is required when creating. Defaults: `projectId`, `description`, `dueAt`
and `completedAt` are null; `status` is `TODO`; `priority` is `MEDIUM`.
`title` is trimmed and limited to 200 characters; `description` allows up to 10000.
`status`: `TODO`, `DONE`. `priority`: `LOW`, `MEDIUM`, `HIGH`.
`positionOverview` and `positionProject` are optional non-negative PostgreSQL integers
(maximum 2147483647). The old `position` field is no longer accepted.
On creation, omitting `positionOverview` appends across all of the user's tasks
(including archived projects); omitting `positionProject` appends within the project,
or the personal list when `projectId` is null.
Moving to another list appends within the destination unless `positionProject` is supplied.
It preserves `positionOverview` unless explicitly supplied. Updating either position
does not change the other.
Automatic appends are serialized to give simultaneous creates/moves distinct positions.
Explicit positions do not reorder other tasks or guarantee uniqueness.

PATCH accepts any non-empty subset of these fields. Set `projectId: null` to move to
the personal list, or `dueAt: null` to clear the deadline. Setting `status: "DONE"`
records `completedAt` automatically; repeated DONE/ordinary edits preserve it.
Changing to TODO clears it. Clients cannot supply `id`, `userId`,
`completedAt`, `createdAt`, `updatedAt` or other unsupported fields.

Deadlines accept a valid ISO datetime with seconds, optional 1–3 fractional digits,
and an explicit timezone (`Z` or `+07:00`, for example). They are stored as PostgreSQL
`timestamptz` and returned as UTC ISO strings. There is no `startsAt` or `deletedAt`.
DELETE permanently removes the task.

## List filters

Filters combine with AND. Without `projectId`, results sort by `positionOverview`,
then `id`. With `projectId` (including `null`), they sort by `positionProject`, then `id`.

| Query parameter          | Meaning                                              |
| ------------------------ | ---------------------------------------------------- |
| `projectId=<id>`         | Tasks in that project                                |
| `projectId=null`         | Personal tasks                                       |
| `status=TODO`            | TODO or DONE                                         |
| `priority=HIGH`          | One of the three priorities                          |
| `dueFrom=<ISO datetime>` | Inclusive deadline lower bound                       |
| `dueTo=<ISO datetime>`   | Exclusive deadline upper bound                       |
| `archived=false`         | Default: personal tasks and tasks in active projects |
| `archived=true`          | Only tasks in archived projects                      |
| `archived=all`           | All of the user's tasks                              |

URL-encode datetime query values, especially `+` in timezone offsets. Use
`URLSearchParams` when constructing calendar queries. Unscheduled tasks are excluded
when a deadline bound is present; if both bounds exist, dueFrom must be before dueTo.

Missing tasks and tasks owned by another user return 404. Assigning to a missing or
another user's project also returns 404. Creating or moving into an archived project
returns 409. Existing archived tasks can still be read, edited, detached or deleted.
The Project API deletes a project and its tasks together in a transaction.

Validation errors return 400; missing session 401; invalid origin 403;
wrong body content type 415. All responses use `Cache-Control: no-store`.

## Reorder tasks

`PATCH /api/tasks/reorder` accepts `{ "taskIds": ["id-b", "id-a"] }` for overview,
or adds `"projectId": "project-id"` for a project (`null` for personal tasks).
Send every visible task in the selected scope exactly once, in the desired order.
The endpoint updates only that scope's position field in one transaction. Archived
tasks retain their relative slots in overview; project ordering is independent.
Duplicate/invalid IDs return 400. A changed or incomplete list returns 409 without
partial updates. Foreign/missing projects return 404; archived projects return 409.
The UI offers a drag handle (mouse/touch) and Alt+Up/Down in All tasks when search is
empty. Today, Done and search results cannot reorder. Failed saves restore the list.

## Verification

With the configured PostgreSQL database and Next dev server running:

```powershell
node scripts/test-task-api.mjs
```

The integration script creates two isolated fixture users, exercises the real HTTP
routes/database, then removes only their data. `API_TEST_URL` can override the base URL.
