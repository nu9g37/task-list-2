import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function moduleUrl(path, dependency) {
  let source = await readFile(path, "utf8");
  if (dependency) source = source.replace('"../overview/overview-data"', JSON.stringify(dependency));
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return "data:text/javascript;base64," + Buffer.from(outputText).toString("base64");
}
const dataUrl = await moduleUrl("components/overview/overview-data.ts");
const { buildOverview, buildProjectOverview } = await import(dataUrl);
const { matchesTaskSearch, searchOverview } = await import(await moduleUrl("components/tasks/task-search.ts", dataUrl));
const row = { title: "Review release notes", description: "Prepare launch" };
for (const query of ["release", "%RELEASE%", "review%", "%notes", " launch ", "", "%%"]) assert.equal(matchesTaskSearch(row, query), true, query);
for (const query of ["release%", "%release", "missing", ".*", "[notes]"]) assert.equal(matchesTaskSearch(row, query), false, query);
assert.equal(matchesTaskSearch({ title: "ตรวจงาน", description: null }, "%งาน"), true);
const user = { id: "u", name: "Test", email: "test@example.com", timezone: "UTC", image: null };
const snapshot = { timezone: "UTC", date: "2026-10-02", asOf: "2026-10-02T00:00:00Z", summary: { totalTasks: 3, todayTasks: 2, overdueTasks: 0, completedTasks: 0 } };
const projects = [{ id: "a", name: "A", color: "#000000" }, { id: "b", name: "B", color: "#ffffff" }];
const tasks = [
  { id: "1", title: "Other", projectId: "a", dueAt: "2026-10-02T01:00:00Z" },
  { id: "2", title: "Review release", projectId: "b", dueAt: "2026-10-02T02:00:00Z" },
  { id: "3", title: "Review draft", projectId: "a", dueAt: null },
].map((task) => ({ ...task, description: null, status: "TODO", priority: "MEDIUM", completedAt: null, position: 0 }));
const data = buildOverview(user, snapshot, projects, tasks);
assert.equal(searchOverview(data, " "), data);
const results = searchOverview(data, "review");
assert.deepEqual(results.tasks.map((task) => task.id), ["2", "3"]);
assert.equal(results.upcoming.title, "Review release");
assert.equal(results.summary.totalTasks, 2);
assert.equal(results.focus.total, 1);
assert.equal(data.tasks.length, 3);
const scoped = buildProjectOverview(user, snapshot, projects, tasks, "a", tasks);
assert.deepEqual(searchOverview(scoped, "review").tasks.map((task) => task.id), ["3"]);
const empty = searchOverview(data, "missing");
assert.equal(empty.tasks.length, 0);
assert.equal(empty.upcoming, null);
assert.equal(empty.summary.totalTasks, 0);
console.log("Task search checks passed: patterns, case, Thai, literal punctuation, project scope, undated tasks, upcoming results, and clearing search.");
