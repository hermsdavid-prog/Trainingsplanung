import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, getWeekStart, shiftWeekStr, getWeekDays, formatWeekLabel } from "@/lib/date";
import { loadRosters, loadRosterMembers, loadSessions } from "@/lib/attendance-data";
import { computeQuotas, periodRange, PERIOD_LABEL, type AttendancePeriod } from "@/lib/attendance";
import { AttendanceBoard } from "@/components/attendance/attendance-board";

const PERIODS: AttendancePeriod[] = ["month", "4weeks", "all"];

export default async function TrainerAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ roster?: string; week?: string; period?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const today = todayISO();

  const rosters = await loadRosters(supabase);
  const roster = rosters.find((r) => r.id === params.roster) ?? rosters[0];

  if (!roster) {
    return (
      <div>
        <div className="kicker">Anwesenheit</div>
        <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Anwesenheit</h2>
        <p className="mt-4 text-sm text-muted">Für deine Gruppen ist keine Anwesenheitsliste eingerichtet.</p>
      </div>
    );
  }

  const weekStart = getWeekStart(/^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "") ? params.week! : today);
  const weekDays = getWeekDays(weekStart);
  const period: AttendancePeriod = PERIODS.includes(params.period as AttendancePeriod) ? (params.period as AttendancePeriod) : "month";
  const range = periodRange(period, today, roster.startDate);

  const [members, week, quotaData] = await Promise.all([
    loadRosterMembers(supabase, roster.id),
    loadSessions(supabase, roster, weekDays[0], weekDays[6]),
    range.from <= range.to ? loadSessions(supabase, roster, range.from, range.to) : Promise.resolve({ sessions: [], absences: [] }),
  ]);
  const quotas = computeQuotas(quotaData.sessions, quotaData.absences, members.map((m) => m.id), today);

  const href = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ roster: roster.id, week: weekStart, period, ...patch });
    return `/trainer/attendance?${q.toString()}`;
  };

  return (
    <div>
      <div className="kicker">{formatWeekLabel(today)}</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Anwesenheit · {roster.name}</h2>
      <p className="mt-2 max-w-[560px] text-[13px] text-muted">
        Alle sind automatisch anwesend. Tippe auf einen Namen, um ihn als abwesend zu markieren. Athleten können sich in der
        App selbst abmelden.
      </p>

      {rosters.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {rosters.map((r) => (
            <Link key={r.id} href={`/trainer/attendance?roster=${r.id}`} className={r.id === roster.id ? "btn btn-primary" : "btn btn-secondary"}>
              {r.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <Link href={href({ week: shiftWeekStr(weekStart, -1) })} className="btn btn-ghost" aria-label="Vorherige Woche">
          ← Woche
        </Link>
        <div className="text-center text-sm font-semibold">
          {formatWeekLabel(weekStart)}
          {weekStart !== getWeekStart(today) && (
            <Link href={href({ week: getWeekStart(today) })} className="ml-2 text-xs font-normal" style={{ color: "var(--dc-accent-700)" }}>
              Heute
            </Link>
          )}
        </div>
        <Link href={href({ week: shiftWeekStr(weekStart, 1) })} className="btn btn-ghost" aria-label="Nächste Woche">
          Woche →
        </Link>
      </div>

      <AttendanceBoard
        rosterId={roster.id}
        today={today}
        weekStart={weekStart}
        members={members}
        sessions={week.sessions}
        absences={week.absences}
      />

      <div className="mt-9">
        <div className="kicker">Anwesenheitsquote</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Link key={p} href={href({ period: p })} className="chip" aria-current={p === period ? "true" : undefined}
              style={p === period ? { background: "var(--dc-accent)", color: "var(--dc-on-accent)", borderColor: "var(--dc-accent)" } : undefined}>
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </div>
        {members.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Noch keine Athleten in den Gruppen.</p>
        ) : (
          <div className="mt-3 max-w-[560px]">
            {members.map((m) => {
              const q = quotas.get(m.id)!;
              return (
                <div key={m.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid var(--dc-divider)" }}>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{m.full_name}</span>
                  <span className="w-[86px] flex-none text-right text-xs tabular-nums text-muted">
                    {q.present} von {q.total}
                  </span>
                  <div className="h-[6px] w-[80px] flex-none" style={{ background: "color-mix(in srgb, var(--dc-text) 12%, transparent)" }}>
                    <div className="h-[6px]" style={{ width: `${q.pct ?? 0}%`, background: (q.pct ?? 100) < 70 ? "var(--dc-accent-2-500)" : "var(--dc-accent)" }} />
                  </div>
                  <span className="w-[44px] flex-none text-right text-sm font-semibold tabular-nums">{q.pct == null ? "–" : `${q.pct} %`}</span>
                </div>
              );
            })}
            <p className="mt-2 text-xs text-muted">
              Gezählt werden stattgefundene Trainings vom {range.from.split("-").reverse().join(".")} bis heute. Entfernte Termine
              zählen nicht.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
