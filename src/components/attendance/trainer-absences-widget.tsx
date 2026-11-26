import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateCompact, formatDateLabel, getWeekStart, shiftDateISO } from "@/lib/date";
import { loadRosterMembers, loadRosters, loadSessions } from "@/lib/attendance-data";
import { formatTimeRange } from "@/lib/attendance";

// Trainer dashboard: who is missing today and in the coming days, per
// attendance roster. Today is always listed; later sessions only when
// someone has signed off.
export async function TrainerAbsencesWidget({ today }: { today: string }) {
  const supabase = await createClient();
  const rosters = await loadRosters(supabase);
  if (rosters.length === 0) return null;

  const blocks = await Promise.all(
    rosters.map(async (roster) => {
      const [members, { sessions, absences }] = await Promise.all([
        loadRosterMembers(supabase, roster.id),
        loadSessions(supabase, roster, today, shiftDateISO(today, 6)),
      ]);
      const nameOf = new Map(members.map((m) => [m.id, m.full_name]));
      const rows = sessions
        .filter((s) => !s.cancelled_at)
        .map((s) => ({
          session: s,
          missing: absences
            .filter((a) => a.session_id === s.id && nameOf.has(a.athlete_id))
            .map((a) => ({ name: nameOf.get(a.athlete_id)!, reason: a.reason, self: a.self_reported }))
            .sort((a, b) => a.name.localeCompare(b.name, "de")),
        }))
        .filter((r) => r.session.date === today || r.missing.length > 0);
      return { roster, rows, memberCount: members.length };
    })
  );

  return (
    <>
      {blocks.map(({ roster, rows, memberCount }) => (
        <div key={roster.id} className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <div className="kicker-muted">Anwesenheit {roster.name}</div>
            <Link
              href={`/trainer/attendance?roster=${roster.id}&week=${getWeekStart(today)}`}
              className="text-xs"
              style={{ color: "var(--dc-accent-700)" }}
            >
              Zur Anwesenheit →
            </Link>
          </div>
          {rows.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted">Heute kein Training, keine Abmeldungen in den nächsten 7 Tagen.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {rows.map(({ session, missing }) => (
                <div
                  key={session.id}
                  className="p-3.5"
                  style={{
                    background: "var(--dc-surface)",
                    borderLeft: `2px solid ${missing.length > 0 ? "var(--dc-accent-2-500)" : "var(--dc-accent)"}`,
                  }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-[15px]">
                      <span className="capitalize">{session.date === today ? "Heute" : formatDateLabel(session.date).split(",")[0]}</span>
                      {session.date !== today && `, ${formatDateCompact(session.date)}`} ·{" "}
                      <span className="tabular-nums">{formatTimeRange(session.start_time, session.end_time)}</span>
                    </span>
                    <span className="text-xs text-muted">
                      {memberCount - missing.length} von {memberCount} dabei
                    </span>
                  </div>
                  {missing.length === 0 ? (
                    <div className="mt-1 text-xs text-muted">Alle dabei, keine Abmeldungen.</div>
                  ) : (
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {missing.map((m) => (
                        <li key={m.name} className="text-[13px]">
                          <span style={{ color: "var(--dc-accent-2-700)" }}>✕</span> {m.name}
                          <span className="text-muted">
                            {" · "}
                            {m.reason ?? (m.self ? "ohne Grund abgemeldet" : "vom Trainer als abwesend eingetragen")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
