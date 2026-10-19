/** Keep named zones so daylight-saving rules apply to each task's date. */
export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9_+/-]*$/.test(value))
    return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function getDeviceTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(timezone) ? timezone : "UTC";
  } catch {
    return "UTC";
  }
}

/** Format an instant for date/time inputs in the account's timezone. */
export function taskDateTime(
  value: string,
  timezone: string,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

/** Convert account wall time to UTC, rejecting invalid dates and DST gaps. */
export function taskDueAt(
  date: string,
  time: string,
  timezone: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const wallTime = `${date}T${time}:00.000Z`;
  const timestamp = Date.parse(wallTime);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== wallTime
  )
    return null;

  // Sample both sides of a transition to discover the applicable UTC offsets.
  const candidates = new Set<number>();
  for (const days of [-1, 0, 1]) {
    const sample = timestamp + days * 86400000;
    const local = taskDateTime(new Date(sample).toISOString(), timezone);
    const offset = Date.parse(`${local.date}T${local.time}:00.000Z`) - sample;
    const candidate = timestamp - offset;
    const result = taskDateTime(new Date(candidate).toISOString(), timezone);
    if (result.date === date && result.time === time) candidates.add(candidate);
  }
  // Repeated DST times resolve to the earlier instant. Unedited tasks keep
  // their original instant in TaskForm, including seconds and the later fold.
  return candidates.size
    ? new Date(Math.min(...candidates)).toISOString()
    : null;
}

export function timezoneLabel(timezone: string, date = new Date()): string {
  const offset =
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return `${offset === "GMT" ? "UTC+00:00" : offset.replace("GMT", "UTC")} — ${timezone.replaceAll("_", " ")}`;
}

export function timezoneOptions(current: string) {
  const zones = new Set(["UTC", ...Intl.supportedValuesOf("timeZone")]);
  if (isValidTimezone(current)) zones.add(current);
  const date = new Date();
  return [...zones]
    .sort()
    .map((value) => ({ value, label: timezoneLabel(value, date) }));
}

/** Better Auth validates this on both sign-up and profile updates. */
export const timezoneValidator = {
  "~standard": {
    version: 1 as const,
    vendor: "tasklist",
    validate(value: unknown) {
      return isValidTimezone(value)
        ? { value }
        : { issues: [{ message: "Please select a valid timezone." }] };
    },
  },
};
