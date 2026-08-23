import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateLabel } from "@/lib/date";
import { ProposedEventsWidget, type ProposedEvent } from "@/components/calendar/proposed-events-widget";
import {
  computeHealthStatus,
  HEALTH_STATUS_LABEL,
  type HealthLog,
  type HealthStatusLevel,
} from "@/lib/health-status";

const LEVEL_ORDER: Record<HealthStatusLevel, number> = { red: 0, yellow: 1, none: 2, green: 3 };
const LEVEL_TAG: Record<HealthStatusLevel, string> = {
  red: "tag-accent-2",
  yellow: "tag-accent",
  green: "tag-neutral",
  none: "tag-outline",
};

export default async function TrainerDashboardPage() {
  const today = todayISO();
  const rangeStart = shiftDateISO(today, -30);

  const supabase = await createClient();

  const [{ data: groupAthleteRows }, { data: todaysPlans }, { data: proposedRows }] = await Promise.all([
    supabase.from("group_athletes").select("athlete_id, profiles(full_name)"),
    supabase
      .from("training_plans")
      .select("id, title, category_label, scope_type, groups(name), profiles!training_plans_athlete_id_fkey(full_name)")
      .eq("date", today),
    supabase
      .from("events")
      .select("id, title, start_at, groups(name), profiles!events_athlete_id_fkey(full_name)")
      .eq("status", "proposed")
      .order("start_at"),
  ]);

  const proposedEvents: ProposedEvent[] = (proposedRows ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.start_at.slice(0, 10),
    groupName: e.groups?.name ?? "—",
    proposedBy: e.profiles?.full_name ?? "—",
  }));

  const athleteMap = new Map<string, string>();
  for (const row of groupAthleteRows ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries()).map(([id, full_name]) => ({
    id,
    full_name,
  }));

  const athleteIds = athletes.map((a) => a.id);
  const { data: logs } = athleteIds.length
    ? await supabase
        .from("health_logs")
        .select("athlete_id, date, hrv, resting_hr, wellbeing")
        .in("athlete_id", athleteIds)
        .gte("date", rangeStart)
        .order("date")
    : { data: [] };

  const logsByAthlete = new Map<string, HealthLog[]>();
  for (const log of logs ?? []) {
    logsByAthlete.set(log.athlete_id, [...(logsByAthlete.get(log.athlete_id) ?? []), log]);
  }

  const rows = athletes
    .map((athlete) => {
      const athleteLogs = logsByAthlete.get(athlete.id) ?? [];
      const { level, today: todayLog } = computeHealthStatus(athleteLogs, today);
      return { athlete, level, todayLog };
    })
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const redCount = rows.filter((r) => r.level === "red").length;
  const checkedInCount = rows.filter((r) => r.todayLog).length;

  return (
    <div>
      <div className="kicker">{formatDateLabel(today)}</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">
        Übersicht
      </h2>
      <p className="mt-3 text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
        {(todaysPlans ?? []).length} Einheiten heute geplant · {checkedInCount} von {athletes.length}{" "}
        Athleten eingecheckt{redCount > 0 ? ` · ${redCount} rote Bereitschaft${redCount > 1 ? "en" : ""}` : ""}
      </p>

      <ProposedEventsWidget events={proposedEvents} />

      {(todaysPlans ?? []).length > 0 && (
        <div className="mt-6 flex flex-col gap-2.5">
          {(todaysPlans ?? []).map((plan) => (
            <div
              key={plan.id}
              className="p-3.5"
              style={{ background: "var(--dc-surface)", borderLeft: "2px solid var(--dc-accent)" }}
            >
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="text-[16px]">{plan.title}</span>
                <span className="tag tag-outline">{plan.category_label}</span>
              </div>
              <div className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                {plan.scope_type === "group"
                  ? (plan.groups?.name ?? "Gruppe")
                  : (plan.profiles?.full_name ?? "Einzeltraining")}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="kicker-muted mt-8">Trainingsbereitschaft</div>
      {athletes.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Noch keine Athleten in deinen Gruppen.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="table" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th>Athlet</th>
                <th>Bereitschaft</th>
                <th>Heute</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ athlete, level, todayLog }) => (
                <tr key={athlete.id}>
                  <td className="text-[15px]">{athlete.full_name}</td>
                  <td>
                    <span className={`tag ${LEVEL_TAG[level]}`}>{HEALTH_STATUS_LABEL[level]}</span>
                  </td>
                  <td
                    className="text-[13px]"
                    style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}
                  >
                    {todayLog
                      ? `Wohlbefinden ${todayLog.wellbeing ?? "—"}${
                          todayLog.hrv != null ? ` · HRV ${todayLog.hrv}` : ""
                        }${todayLog.resting_hr != null ? ` · Ruhe-HF ${todayLog.resting_hr}` : ""}`
                      : "Noch keine Eingabe für heute"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
