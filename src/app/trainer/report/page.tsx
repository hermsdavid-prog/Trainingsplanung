import { createClient } from "@/lib/supabase/server";
import {
  todayISO,
  shiftDateISO,
  getWeekDays,
  getISOWeekNumber,
  formatDateCompact,
} from "@/lib/date";
import { computeHealthStatus, HEALTH_STATUS_LABEL, type HealthLog, type HealthStatusLevel } from "@/lib/health-status";
import { HealthGroupFilter } from "@/components/health/health-group-filter";
import { PrintButton } from "@/components/health/print-button";

const LEVEL_TAG: Record<HealthStatusLevel, string> = {
  red: "tag-accent-2",
  yellow: "tag-accent",
  green: "tag-neutral",
  none: "tag-outline",
};

export default async function TrainerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const today = todayISO();

  const { data: groups } = await supabase.from("groups").select("id, name").order("name");
  const selectedGroup =
    params.group && (groups ?? []).some((g) => g.id === params.group) ? params.group : groups?.[0]?.id;
  const group = (groups ?? []).find((g) => g.id === selectedGroup);

  if (!selectedGroup) {
    return (
      <div>
        <div className="kicker">Wochenbericht</div>
        <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Wochenbericht</h2>
        <p className="mt-5 text-sm text-muted">Noch keine Gruppen angelegt.</p>
      </div>
    );
  }

  const weekDays = getWeekDays(today);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekNumber = getISOWeekNumber(today);
  const prevWeekStart = shiftDateISO(weekStart, -7);
  const prevWeekEnd = shiftDateISO(weekEnd, -7);
  const historyStart = shiftDateISO(weekStart, -37); // rolling history window for readiness

  const { data: groupAthleteRows } = await supabase
    .from("group_athletes")
    .select("athlete_id, profiles(full_name)")
    .eq("group_id", selectedGroup);

  const athletes = (groupAthleteRows ?? [])
    .filter((r) => r.profiles?.full_name)
    .map((r) => ({ id: r.athlete_id, full_name: r.profiles!.full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const athleteIds = athletes.map((a) => a.id);
  const athleteName = new Map(athletes.map((a) => [a.id, a.full_name]));

  if (athleteIds.length === 0) {
    return (
      <div>
        <div className="kicker">Wochenbericht · Woche {weekNumber}</div>
        <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">{group?.name}</h2>
        <div className="mt-6">
          <HealthGroupFilter key={selectedGroup} groups={groups ?? []} />
        </div>
        <p className="mt-5 text-sm text-muted">Noch keine Athleten in dieser Gruppe.</p>
      </div>
    );
  }

  // --- Sessions this week (planned + documented) -----------------------
  async function plansInRange(start: string, end: string) {
    const { data } = await supabase
      .from("training_plans")
      .select("id, category_label, scope_type, athlete_id, group_id, date")
      .gte("date", start)
      .lte("date", end)
      .or(`group_id.eq.${selectedGroup},athlete_id.in.(${athleteIds.join(",")})`);
    return data ?? [];
  }

  function assignedAthletes(plan: { scope_type: string; athlete_id: string | null }) {
    if (plan.scope_type === "group") return athleteIds;
    return plan.athlete_id && athleteIds.includes(plan.athlete_id) ? [plan.athlete_id] : [];
  }

  async function documentedRatio(start: string, end: string) {
    const plans = await plansInRange(start, end);
    const planIds = plans.map((p) => p.id);
    const { data: ratings } = planIds.length
      ? await supabase
          .from("session_ratings")
          .select("training_plan_id, athlete_id")
          .in("training_plan_id", planIds)
          .in("athlete_id", athleteIds)
      : { data: [] };
    const ratedSet = new Set((ratings ?? []).map((r) => `${r.training_plan_id}:${r.athlete_id}`));
    let total = 0;
    let documented = 0;
    for (const plan of plans) {
      for (const aId of assignedAthletes(plan)) {
        total += 1;
        if (ratedSet.has(`${plan.id}:${aId}`)) documented += 1;
      }
    }
    return { plans, total, documented };
  }

  const [thisWeek, prevWeek] = await Promise.all([
    documentedRatio(weekStart, weekEnd),
    documentedRatio(prevWeekStart, prevWeekEnd),
  ]);

  const pct = thisWeek.total > 0 ? Math.round((thisWeek.documented / thisWeek.total) * 100) : 0;
  const prevPct = prevWeek.total > 0 ? Math.round((prevWeek.documented / prevWeek.total) * 100) : null;

  const athletikCount = thisWeek.plans.filter((p) => p.category_label === "Athletik").length;
  const sportCount = thisWeek.plans.filter((p) => p.category_label === "Sportartspezifisch").length;

  // Per-athlete "Woche" progress (documented / assigned) for the table.
  const { data: ratingsThisWeek } = thisWeek.plans.length
    ? await supabase
        .from("session_ratings")
        .select("training_plan_id, athlete_id")
        .in(
          "training_plan_id",
          thisWeek.plans.map((p) => p.id)
        )
        .in("athlete_id", athleteIds)
    : { data: [] };
  const ratedByAthlete = new Set((ratingsThisWeek ?? []).map((r) => `${r.training_plan_id}:${r.athlete_id}`));
  const assignedTotalByAthlete = new Map<string, number>();
  const documentedByAthlete = new Map<string, number>();
  for (const plan of thisWeek.plans) {
    for (const aId of assignedAthletes(plan)) {
      assignedTotalByAthlete.set(aId, (assignedTotalByAthlete.get(aId) ?? 0) + 1);
      if (ratedByAthlete.has(`${plan.id}:${aId}`)) {
        documentedByAthlete.set(aId, (documentedByAthlete.get(aId) ?? 0) + 1);
      }
    }
  }

  // --- Top set + deviations from exercise results -----------------------
  const [{ data: weekResultRows }, { data: priorResultRows }] = await Promise.all([
    supabase
      .from("exercise_results")
      .select("athlete_id, exercise_id, date, value, unit, set_type, exercises(name)")
      .in("athlete_id", athleteIds)
      .eq("set_type", "arbeitssatz")
      .gte("date", weekStart)
      .lte("date", weekEnd),
    supabase
      .from("exercise_results")
      .select("athlete_id, exercise_id, date, value")
      .in("athlete_id", athleteIds)
      .eq("set_type", "arbeitssatz")
      .lt("date", weekStart)
      .order("date"),
  ]);

  type TopSet = { athleteId: string; exerciseName: string; value: number; unit: string | null; date: string };
  const bestThisWeekByAthlete = new Map<string, TopSet>();
  const bestThisWeekByAthleteExercise = new Map<string, number>();
  for (const r of weekResultRows ?? []) {
    if (!r.exercises?.name) continue;
    const key = `${r.athlete_id}:${r.exercise_id}`;
    const prevBest = bestThisWeekByAthleteExercise.get(key);
    if (prevBest === undefined || r.value > prevBest) bestThisWeekByAthleteExercise.set(key, r.value);

    const current = bestThisWeekByAthlete.get(r.athlete_id);
    if (!current || r.value > current.value) {
      bestThisWeekByAthlete.set(r.athlete_id, {
        athleteId: r.athlete_id,
        exerciseName: r.exercises.name,
        value: r.value,
        unit: r.unit,
        date: r.date,
      });
    }
  }

  const priorBestByAthleteExercise = new Map<string, number>();
  for (const r of priorResultRows ?? []) {
    // rows are ordered by date ascending, so the last write wins = most recent prior value
    priorBestByAthleteExercise.set(`${r.athlete_id}:${r.exercise_id}`, r.value);
  }

  let deviationCount = 0;
  let reducedCount = 0;
  const reducedByAthlete = new Map<string, string[]>(); // athleteId -> exercise names reduced
  for (const [key, value] of bestThisWeekByAthleteExercise) {
    const prior = priorBestByAthleteExercise.get(key);
    if (prior === undefined || prior === value) continue;
    deviationCount += 1;
    if (value < prior) {
      reducedCount += 1;
      const [athleteId, exerciseId] = key.split(":");
      const exerciseName = (weekResultRows ?? []).find((r) => r.exercise_id === exerciseId)?.exercises?.name ?? "";
      reducedByAthlete.set(athleteId, [...(reducedByAthlete.get(athleteId) ?? []), exerciseName]);
    }
  }

  // --- Readiness (health_logs) this week ---------------------------------
  const { data: allLogs } = await supabase
    .from("health_logs")
    .select("athlete_id, date, hrv, resting_hr, wellbeing")
    .in("athlete_id", athleteIds)
    .gte("date", historyStart)
    .lte("date", weekEnd)
    .order("date");

  const logsByAthlete = new Map<string, HealthLog[]>();
  for (const log of allLogs ?? []) {
    logsByAthlete.set(log.athlete_id, [...(logsByAthlete.get(log.athlete_id) ?? []), log]);
  }

  const redDaysByAthlete = new Map<string, string[]>(); // athleteId -> dates flagged red this week
  const daysThisWeekUpToToday = weekDays.filter((d) => d <= today);
  for (const athleteId of athleteIds) {
    const logs = logsByAthlete.get(athleteId) ?? [];
    for (const day of daysThisWeekUpToToday) {
      const logsUpToDay = logs.filter((l) => l.date <= day);
      const { level } = computeHealthStatus(logsUpToDay, day);
      if (level === "red") {
        redDaysByAthlete.set(athleteId, [...(redDaysByAthlete.get(athleteId) ?? []), day]);
      }
    }
  }
  const redCount = Array.from(redDaysByAthlete.values()).reduce((sum, days) => sum + days.length, 0);
  const redAthleteIds = Array.from(redDaysByAthlete.keys());

  let redSubLabel = "keine diese Woche";
  if (redCount > 0) {
    if (redAthleteIds.length === 1) {
      redSubLabel = `alle bei ${athleteName.get(redAthleteIds[0])}`;
    } else {
      const [mostFlagged] = [...redDaysByAthlete.entries()].sort((a, b) => b[1].length - a[1].length)[0];
      redSubLabel = `u. a. bei ${athleteName.get(mostFlagged)}`;
    }
  }

  // Current-moment readiness per athlete (for the table tag), same rule as
  // the Gesundheit page.
  function currentReadiness(athleteId: string): HealthStatusLevel {
    const logs = (logsByAthlete.get(athleteId) ?? []).filter((l) => l.date <= today);
    return computeHealthStatus(logs, today).level;
  }

  const kpis = [
    {
      v: String(thisWeek.plans.length),
      l: "Einheiten geplant",
      s: `${athletikCount} Athletik · ${sportCount} Sportartspezifisch`,
    },
    {
      v: `${pct} %`,
      l: "dokumentiert",
      s: prevPct != null ? `Vorwoche ${prevPct} %` : "keine Vorwoche-Daten",
    },
    {
      v: String(deviationCount),
      l: "Abweichungen",
      s: reducedCount > 0 ? `${reducedCount} davon Gewicht reduziert` : "keine Reduktion",
    },
    {
      v: String(redCount),
      l: "rote Bereitschaften",
      s: redSubLabel,
    },
  ];

  const trainerRows = athletes.map((a) => {
    const assigned = assignedTotalByAthlete.get(a.id) ?? 0;
    const documented = documentedByAthlete.get(a.id) ?? 0;
    const top = bestThisWeekByAthlete.get(a.id);
    const readyLevel = currentReadiness(a.id);
    const redDays = redDaysByAthlete.get(a.id) ?? [];
    const reduced = reducedByAthlete.get(a.id) ?? [];

    let note = "—";
    if (redDays.length > 0) {
      note = `Bereitschaft rot am ${formatDateCompact(redDays[redDays.length - 1])}`;
    } else if (reduced.length > 0) {
      note = `Gewicht reduziert bei ${reduced[0]}`;
    }

    return {
      name: a.full_name,
      progress: assigned > 0 ? `${documented} von ${assigned} dokumentiert` : "keine Einheit",
      ready: HEALTH_STATUS_LABEL[readyLevel],
      readyClass: LEVEL_TAG[readyLevel],
      top: top ? `${top.exerciseName} ${top.value}${top.unit ? ` ${top.unit}` : ""}` : "—",
      note,
    };
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-6 border-b-2 pb-4" style={{ borderColor: "var(--dc-text)" }}>
        <div>
          <div className="kicker">Wochenbericht · Woche {weekNumber}</div>
          <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">{group?.name}</h2>
        </div>
        <PrintButton />
      </div>

      <div className="no-print mt-5">
        <HealthGroupFilter key={selectedGroup} groups={groups ?? []} />
      </div>

      <div className="mt-7 grid grid-cols-2 gap-[18px] lg:grid-cols-4 lg:gap-[26px]">
        {kpis.map((k) => (
          <div key={k.l}>
            <div className="font-semibold text-[28px] leading-none lg:text-[34px]" style={{ fontFamily: "var(--dc-font-heading)" }}>
              {k.v}
            </div>
            <div className="mt-1.5 text-[13px]">{k.l}</div>
            <div className="mt-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
              {k.s}
            </div>
          </div>
        ))}
      </div>

      <table className="table mt-8">
        <thead>
          <tr>
            <th>Athlet</th>
            <th>Woche</th>
            <th>Bereitschaft</th>
            <th>Top-Satz</th>
            <th>Auffällig</th>
          </tr>
        </thead>
        <tbody>
          {trainerRows.map((r) => (
            <tr key={r.name}>
              <td className="text-[15px]">{r.name}</td>
              <td>{r.progress}</td>
              <td>
                <span className={`tag ${r.readyClass}`}>{r.ready}</span>
              </td>
              <td style={{ color: "color-mix(in srgb, var(--dc-text) 75%, transparent)" }}>{r.top}</td>
              <td className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                {r.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-7 max-w-[600px] text-sm leading-[1.6]">
        Der Bericht wird in der App gelesen oder als PDF gesichert — verschickt wird nichts.
      </div>
    </div>
  );
}
