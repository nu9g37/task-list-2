# Calendar

`/calendar` uses the shared workspace sidebar and header. The server page redirects unauthenticated users to `/sign-in`; API authentication failures do the same.

Calendar data comes from the existing overview, user, projects and tasks APIs. Only tasks with a due date are displayed, grouped by the user's timezone and colored by project. The grid starts on Monday and supports months with four, five or six weeks, plus Week and Agenda views.

Selecting a date shows its timed tasks in `DayPanel`. Checkboxes update task status through the tasks API. The top New task button reuses `TaskForm` and refreshes calendar/sidebar data after creation.

The right panel has no Add task button. The design's bottom caption and saved-status indicator are omitted as requested.

Date boundary checks: `node scripts/test-calendar-data.mjs`.
