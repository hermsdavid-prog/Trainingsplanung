import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateLabel } from "@/lib/date";
import { ProposedEventsWidget, type ProposedEvent } from "@/components/calendar/proposed-events-widget";
import { ReadinessPanel, type ReadinessRow } from "@/components/trainer/readiness-panel";
import { AthleteHints, type AthleteHint } from "@/components/trainer/athlete-hints";
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

  const [{ data: groupAthleteRows }, { data: todaysPlans }, { data: proposedRows }, { data: consentRows }] = await Promise.all([
    supabase.from("group_athletes").select("group_id, athlete_id, profiles(full_name)"),
    supabase
      .from("training_plans")
      .select("id, date, title, time, category_label, scope_type, group_id, groups(name), profiles!training_plans_athlete_id_fkey(full_name)")
      .in("date", [shiftDateISO(today, -1), today])
      .order("time", { nullsFirst: false }),
    supabase
      .from("events")
      .select("id, title, description, start_at, groups(name), profiles!events_athlete_id_fkey(full_name)")
      .eq("status", "proposed")
      .order("start_at"),
    supabase.from("athlete_consents").select("athlete_id").eq("health_consent", true),
  ]);

  // Today's and yesterday's trainings with how many athletes finished them
  // (an RPE saved at "Training beenden") and how hard it felt on average.
  const recentPlans = todaysPlans ?? [];
  const { data: ratingRows } = recentPlans.length
    ? await supabase
        .from("session_ratings")
        .select("training_plan_id, rpe")
        .in(
          "training_plan_id",
          recentPlans.map((p) => p.id)
        )
    : { data: [] };
  const groupSize = new Map<string, number>();
  for (const row of groupAthleteRows ?? []) groupSize.set(row.group_id, (groupSize.get(row.group_id) ?? 0) + 1);
  const ratingsByPlan = new Map<string, number[]>();
  for (const r of ratingRows ?? []) {
    if (r.rpe != null) ratingsByPlan.set(r.training_plan_id, [...(ratingsByPlan.get(r.training_plan_id) ?? []), r.rpe]);
  }
  const progressLabel = (plan: { id: string; scope_type: string; group_id: string | null }) => {
    const ratings = ratingsByPlan.get(plan.id) ?? [];
    const expected = plan.scope_type === "group" ? (plan.group_id ? groupSize.get(plan.group_id) ?? 0 : 0) : 1;
    const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1).replace(".", ",") : null;
    return `${ratings.length}/${expected} erledigt${avg ? ` · Ø RPE ${avg}` : ""}`;
  };
  const plansToday = recentPlans.filter((p) => p.date === today);
  const plansYesterday = recentPlans.filter((p) => p.date !== today);

  const proposedEvents: ProposedEvent[] = (proposedRows ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.start_at.slice(0, 10),
    groupName: e.groups?.name ?? "—",
    proposedBy: e.profiles?.full_name ?? "—",
  }));

  const athleteMap = new Map<string, string>();
  const groupIdByAthlete = new Map<string, string>();
  for (const row of groupAthleteRows ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
    if (!groupIdByAthlete.has(row.athlete_id)) groupIdByAthlete.set(row.athlete_id, row.group_id);
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

  // Open "Hinweis an den Trainer" messages athletes left on an exercise
  // during a session ("Schmerzen im Knie") — surfaced here until a trainer
  // answers or marks them as done.
  const { data: noteRows } = athleteIds.length
    ? await supabase
        .from("athlete_feedback")
        .select("id, athlete_id, note, updated_at, training_plan_items(exercise_name, training_plan_id, training_plans(title, date))")
        .in("athlete_id", athleteIds)
        .not("note", "is", null)
        .is("note_handled_at", null)
        .gte("updated_at", `${shiftDateISO(today, -30)}T00:00:00Z`)
        .order("updated_at", { ascending: false })
        .limit(20)
    : { data: [] };
  const athleteHints: AthleteHint[] = (noteRows ?? [])
    .filter((n) => n.note && n.training_plan_items)
    .map((n) => ({
      feedbackId: n.id,
      athleteId: n.athlete_id,
      athleteName: athleteMap.get(n.athlete_id) ?? "—",
      planId: n.training_plan_items!.training_plan_id,
      planTitle: n.training_plan_items!.training_plans?.title ?? "",
      planDate: n.training_plan_items!.training_plans?.date ?? "",
      exercise: n.training_plan_items!.exercise_name,
      note: n.note as string,
    }));

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

  // Nur Athleten, die sich heute auch eingetragen haben — wer noch keinen
  // Check-in gemacht hat, ist in der Athleten-Sektion einsehbar, muss aber
  // die Trainingsbereitschafts-Übersicht nicht mit "keine Angabe" füllen.
  const readinessRows: ReadinessRow[] = rows
    .filter((r) => r.todayLog)
    .map(({ athlete, level, todayLog }) => ({
      athleteId: athlete.id,
      groupId: groupIdByAthlete.get(athlete.id) ?? "",
      fullName: athlete.full_name,
      level,
      levelLabel: HEALTH_STATUS_LABEL[level],
      levelTagClass: LEVEL_TAG[level],
      todayLabel: `Wohlbefinden ${todayLog!.wellbeing ?? "—"}${
        todayLog!.hrv != null ? ` · HRV ${todayLog!.hrv}` : ""
      }${todayLog!.resting_hr != null ? ` · Ruhe-HF ${todayLog!.resting_hr}` : ""}`,
    }));

  // Who could check in (consented to health data) but hasn't yet today —
  // before training that's exactly the list a trainer wants.
  const consented = new Set((consentRows ?? []).map((c) => c.athlete_id));
  const notCheckedIn = rows
    .filter((r) => !r.todayLog && consented.has(r.athlete.id))
    .map((r) => r.athlete.full_name)
    .sort((a, b) => a.localeCompare(b, "de"));

  return (
    <div>
      <div className="kicker">{formatDateLabel(today)}</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">
        Übersicht
      </h2>
      <p className="mt-3 text-sm" style={{ color: "var(--dc-muted)" }}>
        {plansToday.length} {plansToday.length === 1 ? "Training" : "Trainings"} heute geplant · {checkedInCount} von {athletes.length}{" "}
        Athleten eingecheckt{redCount > 0 ? ` · ${redCount} rote Bereitschaft${redCount > 1 ? "en" : ""}` : ""}
      </p>

      <ProposedEventsWidget events={proposedEvents} />

      <AthleteHints hints={athleteHints} />

      {[
        { label: "Heute", plans: plansToday },
        { label: "Gestern", plans: plansYesterday },
      ].map(({ label, plans }) =>
        plans.length === 0 ? null : (
          <div key={label} className="mt-6">
            <div className="kicker-muted">{label}</div>
            <div className="mt-2 flex flex-col gap-2.5">
              {plans.map((plan) => {
                const isAthletik = plan.category_label?.trim().toLowerCase() === "athletik";
                // Group trainings open the results per athlete; an individual
                // one goes straight to that athlete's sets.
                const href =
                  plan.scope_type === "athlete"
                    ? `/trainer/plans/${plan.id}/edit`
                    : `/trainer/plans/${plan.id}/edit#ergebnisse`;
                return (
                  <Link
                    key={plan.id}
                    href={href}
                    className="block p-3.5 no-underline"
                    style={{
                      background: "var(--dc-surface)",
                      borderLeft: `2px solid ${isAthletik ? "var(--dc-accent)" : "var(--dc-accent-2)"}`,
                      color: "inherit",
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-2.5">
                      <span className="text-[16px]">{plan.title}</span>
                      <span className={`tag ${isAthletik ? "tag-accent" : "tag-accent-2"}`}>{isAthletik ? "Athletik" : "Karate"}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs" style={{ color: "var(--dc-muted)" }}>
                      <span>
                        {plan.time ? `${plan.time} · ` : ""}
                        {plan.scope_type === "group"
                          ? (plan.groups?.name ?? "Gruppe")
                          : (plan.profiles?.full_name ?? "Einzeltraining")}
                      </span>
                      <span style={{ color: "var(--dc-text)" }}>{progressLabel(plan)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )
      )}

      <ReadinessPanel rows={readinessRows} notCheckedIn={notCheckedIn} />
    </div>
  );
}
