import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile("lib/timezone.ts", "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { getDeviceTimezone, isValidTimezone, timezoneLabel, timezoneOptions, timezoneValidator } = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
const winter = new Date("2026-01-15T12:00:00Z");
const summer = new Date("2026-07-15T12:00:00Z");

assert.equal(timezoneLabel("Asia/Bangkok", winter), "UTC+07:00 — Asia/Bangkok");
assert.match(timezoneLabel("Asia/Kolkata", winter), /^UTC\+05:30/);
assert.match(timezoneLabel("Asia/Kathmandu", winter), /^UTC\+05:45/);
assert.match(timezoneLabel("America/New_York", winter), /^UTC-05:00/);
assert.match(timezoneLabel("America/New_York", summer), /^UTC-04:00/);
assert.equal(timezoneLabel("UTC", winter), "UTC+00:00 — UTC");
assert.match(timezoneLabel("Pacific/Kiritimati", winter), /^UTC\+14:00/);
for (const invalid of [null, 7, "", "Invalid/Timezone", "+07:00", "UTC+07:00"]) {
  assert.equal(isValidTimezone(invalid), false);
  assert.ok(timezoneValidator["~standard"].validate(invalid).issues);
}
assert.deepEqual(timezoneValidator["~standard"].validate("Asia/Bangkok"), { value: "Asia/Bangkok" });
const zones = timezoneOptions("US/Eastern");
assert.ok(zones.some(({ value }) => value === "US/Eastern"));
assert.ok(zones.some(({ value }) => value === "UTC"));
assert.equal(new Set(zones.map(({ value }) => value)).size, zones.length);

const original = Intl.DateTimeFormat;
try {
  Intl.DateTimeFormat = function (...args) {
    return args.length ? new original(...args) : { resolvedOptions: () => ({ timeZone: "Asia/Bangkok" }) };
  };
  assert.equal(getDeviceTimezone(), "Asia/Bangkok");
  Intl.DateTimeFormat = function () { throw new Error("Timezone unavailable"); };
  assert.equal(getDeviceTimezone(), "UTC");
} finally {
  Intl.DateTimeFormat = original;
}
console.log("Timezone checks passed: device detection/fallback, validation, fractional offsets, DST and saved aliases.");
