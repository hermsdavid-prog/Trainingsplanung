// Berlin public holidays (Feiertage) and school holidays (Ferien), for
// highlighting them on the calendar. Feiertage are computed algorithmically
// (they follow fixed rules every year); Schulferien are set year-by-year by
// the Senatsverwaltung für Bildung and can't be computed, so they're a
// maintained list below.

// Gauss's Easter algorithm — returns the date of Easter Sunday for a given year.
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

// All Berlin-wide public holidays for a given year (fixed-date + Easter-relative).
export function getBerlinPublicHolidays(year: number): Record<string, string> {
  const easter = easterSunday(year);
  const holidays: Record<string, string> = {
    [`${year}-01-01`]: "Neujahr",
    [toISO(addDays(easter, -2))]: "Karfreitag",
    [toISO(addDays(easter, 1))]: "Ostermontag",
    [`${year}-05-01`]: "Tag der Arbeit",
    [toISO(addDays(easter, 39))]: "Christi Himmelfahrt",
    [toISO(addDays(easter, 50))]: "Pfingstmontag",
    [`${year}-10-03`]: "Tag der Deutschen Einheit",
    [`${year}-10-31`]: "Reformationstag",
    [`${year}-12-25`]: "1. Weihnachtsfeiertag",
    [`${year}-12-26`]: "2. Weihnachtsfeiertag",
  };
  // Internationaler Frauentag has been a Berlin state holiday since 2019.
  if (year >= 2019) {
    holidays[`${year}-03-08`] = "Internationaler Frauentag";
  }
  return holidays;
}

type SchoolHolidayRange = { start: string; end: string; label: string };

// Berlin school holidays (Schulferien), school years 2025/26 through 2027/28.
// Source: Senatsverwaltung für Bildung, Jugend und Familie Berlin, via
// https://www.kalenderpedia.de/ferien/ferien-berlin.html (checked Aug 2026).
// Pentecost break in Berlin isn't one continuous block but a couple of
// scattered non-instructional days around Ascension/Whitsun — represented
// here as short marker ranges rather than a full week. Extend this list once
// the Senate publishes dates beyond 2027/28.
const SCHOOL_HOLIDAYS: SchoolHolidayRange[] = [
  { start: "2025-07-24", end: "2025-09-06", label: "Sommerferien" },
  { start: "2025-10-20", end: "2025-11-01", label: "Herbstferien" },
  { start: "2025-12-22", end: "2026-01-02", label: "Weihnachtsferien" },
  { start: "2026-02-02", end: "2026-02-07", label: "Winterferien" },
  { start: "2026-03-30", end: "2026-04-10", label: "Osterferien" },
  { start: "2026-05-15", end: "2026-05-15", label: "Pfingstferien" },
  { start: "2026-05-26", end: "2026-05-26", label: "Pfingstferien" },
  { start: "2026-07-09", end: "2026-08-22", label: "Sommerferien" },
  { start: "2026-10-19", end: "2026-10-31", label: "Herbstferien" },
  { start: "2026-12-23", end: "2027-01-02", label: "Weihnachtsferien" },
  { start: "2027-02-01", end: "2027-02-06", label: "Winterferien" },
  { start: "2027-03-22", end: "2027-04-02", label: "Osterferien" },
  { start: "2027-05-07", end: "2027-05-07", label: "Pfingstferien" },
  { start: "2027-05-18", end: "2027-05-19", label: "Pfingstferien" },
  { start: "2027-07-01", end: "2027-08-14", label: "Sommerferien" },
  { start: "2027-10-11", end: "2027-10-23", label: "Herbstferien" },
  { start: "2027-12-22", end: "2027-12-31", label: "Weihnachtsferien" },
];

export type BerlinCalendarMark = { type: "feiertag" | "ferien"; label: string };

// Returns the Feiertag/Ferien mark for a single YYYY-MM-DD date, if any.
// Feiertage take precedence in the label when a holiday falls inside a
// Ferien range (both are still true, but only one badge fits on a day cell).
export function getBerlinCalendarMark(dateStr: string): BerlinCalendarMark | null {
  const year = Number(dateStr.slice(0, 4));
  const feiertag = getBerlinPublicHolidays(year)[dateStr] ?? getBerlinPublicHolidays(year - 1)[dateStr];
  if (feiertag) return { type: "feiertag", label: feiertag };
  const ferien = SCHOOL_HOLIDAYS.find((r) => dateStr >= r.start && dateStr <= r.end);
  if (ferien) return { type: "ferien", label: ferien.label };
  return null;
}
