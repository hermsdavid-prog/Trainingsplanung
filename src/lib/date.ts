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
