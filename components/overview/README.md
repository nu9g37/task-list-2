# Overview frontend

The home page loads `/api/me`, `/api/overview`, `/api/projects`, and `/api/tasks`
in parallel using same-origin session cookies and `cache: no-store`.
Data is passed to the sidebar and each presentation component. No demo records are
used. Loading, empty, request-failure/retry, and unauthenticated states are supported.
Requests are cancelled on unmount, and a failed load never displays a partially
loaded account or stale data.

`overview-data.ts` converts API data into the UI view model:

`/projects/[id]` reuses the Overview layout without the Your projects section.
Overview and project routes share `app/(workspace)/layout.tsx`. The client workspace
layout keeps the sidebar/header mounted during navigation, retains sidebar data
while page content loads, and preserves the project folder disclosure state.
Page data updates the sidebar through the workspace context; creating a project
refreshes the active page without remounting the shell.
The server checks project ownership and returns 404 for missing, foreign or archived
projects. The loader fetches `/api/tasks?projectId=...` for its task list, summaries,
focus and upcoming deadline. Sidebar project counts continue to cover all projects.
Creating a task defaults to the currently selected project.

- The Tasks today card uses the Overview API's unfinished count.
- The Task panel defaults to All tasks, showing only unfinished tasks, including
  unscheduled tasks. Reordering preserves hidden completed tasks' positions.
  Today's tasks filters deadlines on the current local day; Done filters DONE.
  The count beside the heading follows the selected filter. Today's tasks includes
  completed tasks and can therefore exceed the unfinished card count.
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
that its Intl implementation does not support. New task opens the creation form.
Task tabs filter locally. Row checkboxes save TODO/DONE through the Task API.
The row options popover opens the shared create/edit form or a delete confirmation.
Editing preserves the current task status and unchanged deadline precision.
Navigation and advanced filters remain disabled.

The home page checks the Better Auth session on the server before rendering and
redirects unauthenticated requests to `/sign-in`. A 401 from the client API loader
also replaces the current route with `/sign-in` if the session expires during load.
Other API errors remain retryable. The sign-in form returns to `/` on success.
A login performed in Postman does not log the browser in.

The dashboard shell occupies one viewport. The header/sidebar stay in place while
the main content scrolls independently. Long navigation lists have their own scroll
area while the profile stays at the bottom. On mobile the compact navigation stays
above the independently scrolling content.

Verification with the local Next dev server and PostgreSQL running:

```powershell
node scripts/test-overview-frontend.mjs
```

This tests the actual loader against all four HTTP APIs with isolated fixture
accounts, plus deterministic timezone/week/progress calculations and errors. It
cleans up only its own fixture users and records.
