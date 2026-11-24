// Calendar dates and wall-clock times in an IANA time zone, without a date
// library. The owner's time zone comes from the settings, so nothing here
// assumes Brasília.

/** Offset (ms) between the wall clock in `timeZone` and UTC at `instant`. */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wall = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

/** YYYY-MM-DD of `instant` in `timeZone`. */
export function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** HH:mm of `instant` in `timeZone`. */
export function localTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

export function isLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** The calendar date `days` after `date` (YYYY-MM-DD). */
export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** The instant the calendar date starts in `timeZone`. */
export function startOfLocalDate(date: string, timeZone: string): Date {
  const midnightUtc = Date.parse(`${date}T00:00:00Z`);
  // Two passes settle the offset even on a daylight-saving change.
  let instant = midnightUtc - timeZoneOffsetMs(new Date(midnightUtc), timeZone);
  instant = midnightUtc - timeZoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}
