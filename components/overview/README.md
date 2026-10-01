# Overview frontend

The home page loads `/api/me`, `/api/overview`, `/api/projects`, and `/api/tasks`
in parallel using same-origin session cookies and `cache: no-store`.
Data is passed to the sidebar and each presentation component. No demo records are
used. Loading, empty, request-failure/retry, and unauthenticated states are supported.
Requests are cancelled on unmount, and a failed load never displays a partially
loaded account or stale data.

`overview-data.ts` converts API data into the UI view model:

- The Tasks today card uses the Overview API's unfinished count.
- Today's task list includes all statuses whose deadline falls on the current
  local day; its count can therefore exceed the unfinished card count.
- Daily Focus is the percentage of tasks due today that are DONE, not the number
  completed today with unrelated deadlines. No tasks means 0%, not 100%.
- Completed this week uses `completedAt`, Monday through Sunday in the effective
  user timezone, and compares to the previous calendar week.
- Upcoming deadlines counts unfinished tasks from the snapshot time through the
  end of the sixth following local day (seven local calendar days including today).
- Coming up shows the earliest unfinished deadline at or after the snapshot time.
- Project cards/sidebar counts and completion percentages use visible tasks from
  the active-project/personal Task API list. Archived projects are excluded.

Dates, greeting and time labels use the effective timezone and `asOf` timestamp
returned by the Overview API. The browser falls back to UTC for a timezone alias
that its Intl implementation does not support. New task, editing, navigation and
filter controls remain disabled in this read-only frontend step.

The browser must have a Better Auth session cookie to show account data. Login UI
is not implemented yet. A login performed in Postman does not log the browser in.
`Check session` retries loading after the session is established; refresh reloads
data after external edits.

Verification with the local Next dev server and PostgreSQL running:

```powershell
node scripts/test-overview-frontend.mjs
```

This tests the actual loader against all four HTTP APIs with isolated fixture
accounts, plus deterministic timezone/week/progress calculations and errors. It
cleans up only its own fixture users and records.
