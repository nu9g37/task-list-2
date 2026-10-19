# Overview API

`GET /api/overview` requires a Better Auth session cookie. No body or query parameters
are needed. Counts include only the signed-in user's personal tasks and tasks in
active projects, matching the default Task API list. Archived projects are excluded.

Example response (200):

```json
{
  "timezone": "Asia/Bangkok",
  "date": "2026-10-01",
  "asOf": "2026-10-01T03:00:00.000Z",
  "summary": {
    "totalTasks": 12,
    "todayTasks": 3,
    "overdueTasks": 2,
    "completedTasks": 5
  }
}
```

- `totalTasks`: all visible tasks, including completed and unscheduled tasks.
- `todayTasks`: unfinished tasks due on the user's current local calendar date,
  from midnight inclusive to the next midnight exclusive.
- `overdueTasks`: unfinished tasks with a deadline strictly before `asOf`, including
  earlier today. A task can count in both todayTasks and overdueTasks.
- `completedTasks`: visible tasks with status DONE, regardless of completion date.
- `date`: current local date in the effective `timezone`.
- `asOf`: the database timestamp used for every counter, serialized as UTC ISO.

Timezone is read from the current user record. Missing or unrecognized PostgreSQL
timezone names fall back to UTC; the effective timezone is returned. Local midnight
boundaries account for daylight saving transitions. All counters are computed in
one SQL statement with a consistent snapshot. An empty account receives four zeros.

No session returns 401. Responses use `Cache-Control: no-store`.
No additional schema/migration is needed.

With PostgreSQL configured and the Next dev server running, verify using:

```powershell
node scripts/test-overview-api.mjs
```

The script creates isolated fixture users and removes only their data afterwards.
