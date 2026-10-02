/** Keep named zones so daylight-saving rules apply to each task's date. */
export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9_+/-]*$/.test(value)) return false;
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

export function timezoneLabel(timezone: string, date = new Date()): string {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" })
    .formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return `${offset === "GMT" ? "UTC+00:00" : offset.replace("GMT", "UTC")} — ${timezone.replaceAll("_", " ")}`;
}

export function timezoneOptions(current: string) {
  const zones = new Set(["UTC", ...Intl.supportedValuesOf("timeZone")]);
  if (isValidTimezone(current)) zones.add(current);
  const date = new Date();
  return [...zones].sort().map((value) => ({ value, label: timezoneLabel(value, date) }));
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
