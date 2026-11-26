// Anwesenheit: everyone on a roster counts as present for every held
// session; only absences are stored. Pure helpers shared by the trainer and
// athlete views.

export type AttendanceSession = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  kind: string;
  note: string | null;
  cancelled_at: string | null;
};

export type AttendanceAbsence = {
  session_id: string;
  athlete_id: string;
  self_reported: boolean;
};

export type AttendanceQuota = { present: number; total: number; pct: number | null };

// "18:00:00" → "18:00"
export function formatTime(t: string): string {
  return t.slice(0, 5);
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

// Only sessions that took place count: not removed and not in the future.
export function heldSessions<T extends Pick<AttendanceSession, "date" | "cancelled_at">>(
  sessions: T[],
  todayIso: string
): T[] {
  return sessions.filter((s) => !s.cancelled_at && s.date <= todayIso);
}

export function computeQuotas(
  sessions: Pick<AttendanceSession, "id" | "date" | "cancelled_at">[],
  absences: Pick<AttendanceAbsence, "session_id" | "athlete_id">[],
  athleteIds: string[],
  todayIso: string
): Map<string, AttendanceQuota> {
  const held = heldSessions(sessions, todayIso);
  const heldIds = new Set(held.map((s) => s.id));
  const absentCount = new Map<string, number>();
  for (const a of absences) {
    if (!heldIds.has(a.session_id)) continue;
    absentCount.set(a.athlete_id, (absentCount.get(a.athlete_id) ?? 0) + 1);
  }
  const result = new Map<string, AttendanceQuota>();
  for (const id of athleteIds) {
    const total = held.length;
    const present = total - (absentCount.get(id) ?? 0);
    result.set(id, { present, total, pct: total > 0 ? Math.round((present / total) * 100) : null });
  }
  return result;
}

export type AttendancePeriod = "month" | "4weeks" | "all";

export const PERIOD_LABEL: Record<AttendancePeriod, string> = {
  month: "Dieser Monat",
  "4weeks": "Letzte 4 Wochen",
  all: "Seit Beginn",
};

// Date range (inclusive) for a quota period, ending today.
export function periodRange(period: AttendancePeriod, todayIso: string, startIso: string): { from: string; to: string } {
  if (period === "month") return { from: `${todayIso.slice(0, 7)}-01`, to: todayIso };
  if (period === "4weeks") {
    const [y, m, d] = todayIso.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, d - 27)).toISOString().slice(0, 10);
    return { from: from < startIso ? startIso : from, to: todayIso };
  }
  return { from: startIso, to: todayIso };
}

// Split [from, to] into chunks the session generator accepts (≤ 90 days).
export function dateChunks(from: string, to: string, maxDays = 90): { from: string; to: string }[] {
  const chunks: { from: string; to: string }[] = [];
  let cursor = from;
  while (cursor <= to) {
    const [y, m, d] = cursor.split("-").map(Number);
    const end = new Date(Date.UTC(y, m - 1, d + maxDays - 1)).toISOString().slice(0, 10);
    const chunkEnd = end < to ? end : to;
    chunks.push({ from: cursor, to: chunkEnd });
    const [ey, em, ed] = chunkEnd.split("-").map(Number);
    cursor = new Date(Date.UTC(ey, em - 1, ed + 1)).toISOString().slice(0, 10);
  }
  return chunks;
}
