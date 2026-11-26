import { createClient } from "@/lib/supabase/server";
import { shiftDateISO } from "@/lib/date";
import { loadRosters, loadSessions } from "@/lib/attendance-data";
import { computeQuotas, periodRange } from "@/lib/attendance";
import { AttendanceSignoffList } from "@/components/attendance/attendance-signoff-list";

// Athlete home: the next week's sessions of every roster the athlete is on,
// with a one-tap sign-off, and the own attendance rate of the last 4 weeks.
export async function AthleteAttendance({ athleteId, today }: { athleteId: string; today: string }) {
  const supabase = await createClient();
  const rosters = await loadRosters(supabase);
  if (rosters.length === 0) return null;

  const blocks = await Promise.all(
    rosters.map(async (roster) => {
      const range = periodRange("4weeks", today, roster.startDate);
      const [upcoming, past] = await Promise.all([
        loadSessions(supabase, roster, today, shiftDateISO(today, 6)),
        range.from <= range.to ? loadSessions(supabase, roster, range.from, range.to) : Promise.resolve({ sessions: [], absences: [] }),
      ]);
      const quota = computeQuotas(past.sessions, past.absences, [athleteId], today).get(athleteId)!;
      return {
        roster,
        quota,
        sessions: upcoming.sessions
          .filter((s) => !s.cancelled_at)
          .map((s) => {
            const absence = upcoming.absences.find((a) => a.session_id === s.id && a.athlete_id === athleteId);
            return { ...s, absent: !!absence, selfReported: absence?.self_reported ?? false };
          }),
      };
    })
  );

  return (
    <div className="mt-7">
      {blocks.map(({ roster, quota, sessions }) => (
        <div key={roster.id} className="mb-5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="kicker">{roster.name} · nächste 7 Tage</div>
            {quota.pct != null && (
              <span className="text-xs text-muted">
                Anwesenheit 4 Wochen: <strong className="tabular-nums">{quota.pct} %</strong>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Du bist automatisch eingetragen. Kannst du nicht kommen, melde dich ab.</p>
          <AttendanceSignoffList sessions={sessions} today={today} />
        </div>
      ))}
    </div>
  );
}
