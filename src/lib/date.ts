const APP_TIMEZONE = "Europe/Berlin";

// Returns today's calendar date (YYYY-MM-DD) in the app's timezone, not the server's.
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

// Shifts a YYYY-MM-DD calendar date by N days without timezone drift.
export function shiftDateISO(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

// Formats a YYYY-MM-DD calendar date as dd/mm/yyyy for compact display.
export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Minutes the app timezone is ahead of UTC at the given instant (handles DST).
function appTimezoneOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUTC - instant.getTime()) / 60000;
}

// Converts a wall-clock date+time entered in the app timezone (e.g. a trainer
// typing "14:00" in Berlin) into the correct UTC ISO instant for storage —
// without this, times get stored as literal UTC and drift by the DST offset.
export function appWallTimeToUTCISOString(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const naiveUTCMs = Date.UTC(y, m - 1, d, hh || 0, mm || 0, 0);
  const offsetMin = appTimezoneOffsetMinutes(new Date(naiveUTCMs));
  return new Date(naiveUTCMs - offsetMin * 60000).toISOString();
}

// Returns the app-timezone calendar date (YYYY-MM-DD) a stored UTC instant
// falls on — a plain `.slice(0, 10)` on the UTC string can land on the wrong
// day near midnight once start_at is stored as a real UTC instant.
export function utcISOToAppDateString(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

// Compact "d.M." form used in chart headers/axes, e.g. "6.8." (no leading zeros).
export function formatDateCompact(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d}.${m}.`;
}

export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function currentMonthStr(): string {
  return todayISO().slice(0, 7);
}

export function shiftMonthStr(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Returns YYYY-MM-DD strings for a Monday-start grid covering the full month
// (padded with leading/trailing days so every week row is complete).
export function getMonthGridDays(monthStr: string): string[] {
  const [y, m] = monthStr.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(Date.UTC(y, m - 1, 1 - firstWeekday));

  const lastOfMonth = new Date(Date.UTC(y, m, 0));
  const lastWeekday = (lastOfMonth.getUTCDay() + 6) % 7;
  const gridEnd = new Date(Date.UTC(y, m - 1, lastOfMonth.getUTCDate() + (6 - lastWeekday)));

  const days: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

// Returns weekly occurrence dates (YYYY-MM-DD), starting at startDate and
// repeating on the same weekday up to and including untilDate.
export function weeklyOccurrences(startDate: string, untilDate: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(sy, sm - 1, sd));
  const until = new Date(untilDate + "T23:59:59Z");
  let guard = 0;
  while (cursor <= until && guard < 104) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
    guard++;
  }
  return dates;
}

// Returns the Monday (YYYY-MM-DD) of the ISO week containing dateStr.
export function getWeekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

// Returns the 7 YYYY-MM-DD dates (Monday through Sunday) of the week
// containing dateStr.
export function getWeekDays(dateStr: string): string[] {
  const start = getWeekStart(dateStr);
  const [y, m, d] = start.split("-").map(Number);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
  }
  return days;
}

// ISO-8601 week number for dateStr.
export function getISOWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

function monthNameUTC(monthIndex1: number): string {
  return new Date(Date.UTC(2000, monthIndex1 - 1, 1)).toLocaleDateString("de-DE", {
    month: "long",
    timeZone: "UTC",
  });
}

// "Woche 34 · 17. bis 23. August" style label for the week containing dateStr.
export function formatWeekLabel(dateStr: string): string {
  const [start, end] = [getWeekDays(dateStr)[0], getWeekDays(dateStr)[6]];
  const weekNum = getISOWeekNumber(dateStr);
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  if (sm === em) {
    return `Woche ${weekNum} · ${sd}. bis ${ed}. ${monthNameUTC(em)}`;
  }
  return `Woche ${weekNum} · ${sd}. ${monthNameUTC(sm)} bis ${ed}. ${monthNameUTC(em)}`;
}

// "Mo · 17.08." short weekday + date label used in the weekly board columns.
export function formatWeekdayShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = date.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" });
  return `${weekday} · ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;
}
