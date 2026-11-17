import assert from "node:assert/strict";
import { importTs } from "./load-ts.mjs";

const { monthDays, weekDays, shiftMonth, shiftDay, localDay, calendarTasks } =
  await importTs("src/features/calendar/data.ts");
assert.equal(monthDays("2026-09").length, 35);
assert.equal(monthDays("2026-09")[0], "2026-08-31");
assert.equal(monthDays("2026-09").at(-1), "2026-10-04");
assert.equal(monthDays("2026-08").length, 42);
assert.equal(shiftMonth("2026-12", 1), "2027-01");
assert.equal(shiftDay("2024-02-28", 1), "2024-02-29");
assert.equal(weekDays("2027-01-01")[0], "2026-12-28");
assert.equal(localDay("2026-09-30T18:00:00Z", "Asia/Bangkok"), "2026-10-01");
const tasks = calendarTasks({
  timezone: "Asia/Bangkok",
  projects: [{ id: "p", name: "Test", color: "#ABCDEF" }],
  tasks: [
    {
      source: {
        id: "1",
        projectId: "p",
        dueAt: "2026-09-30T18:00:00Z",
        status: "TODO",
      },
    },
    { source: { id: "2", projectId: null, dueAt: null } },
  ],
});
assert.equal(tasks.length, 1);
assert.equal(tasks[0].day, "2026-10-01");
assert.equal(tasks[0].color, "#ABCDEF");
console.log(
  "Calendar date checks passed: month/week boundaries, six-week months, leap years, timezone rollover and unscheduled exclusion.",
);
