import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateLabel, formatDateCompact, isMesocycleCurrent } from "@/lib/date";
import { GoalKickoffPrompt, type KickoffRecap } from "@/components/mesocycles/goal-kickoff-prompt";

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}
import { HealthCheckinCard } from "@/components/health/health-checkin-card";
import { CheckinGate } from "@/components/health/checkin-gate";
import {
  computeHealthStatus,
  HEALTH_STATUS_LABEL,
  type HealthStatusLevel,
} from "@/lib/health-status";
import { computeExerciseTrends } from "@/lib/exercise-trend";
import { ExerciseTrendList } from "@/components/athletik/exercise-trend-list";
import { HealthChart } from "@/components/health/health-chart";
import { CoachNotesBanner } from "@/components/athletes/coach-notes-banner";
import { BadgesList } from "@/components/athletes/badges-list";
import { GoalsPanel, type MesocycleGoalGroup } from "@/components/athletes/goals-panel";

const LEVEL_TAG: Record<HealthStatusLevel, string> = {
  red: "tag-accent-2",
  yellow: "tag-accent",
  green: "tag-neutral",
  none: "tag-outline",
};

export default async function AthleteTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = todayISO();
  const date = dateParam || today;
  const rangeStart = shiftDateISO(today, -14);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plans }, { data: healthLog }, { data: recentLogs }, { data: exerciseResultRows }, { data: unreadNoteRows }, { data: badgeRows }, { data: ratingRows }, { data: consentRow }] =
    await Promise.all([
      supabase
        .from("training_plans")
        .select("id, title, time, category_label, scope_type, groups(name, color)")
        .eq("date", date)
        .order("time", { nullsFirst: false }),
      date === today && user
        ? supabase
            .from("health_logs")
            .select("hrv, resting_hr, wellbeing")
            .eq("athlete_id", user.id)
            .eq("date", date)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("health_logs")
            .select("date, hrv, resting_hr, wellbeing")
            .eq("athlete_id", user.id)
            .gte("date", rangeStart)
            .order("date")
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("exercise_results")
            .select("exercise_id, date, value, unit, set_type, exercises(name)")
            .eq("athlete_id", user.id)
            // Newest first and capped: the trends only compare the latest
            // sessions, and an unbounded query silently stopped at the API's
            // row limit (dropping exactly the newest results).
            .order("date", { ascending: false })
            .limit(3000)
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("athlete_notes")
            .select("id, message, created_at, profiles!athlete_notes_trainer_id_fkey(full_name)")
            .eq("athlete_id", user.id)
            .is("read_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("athlete_badges")
            .select("badge_key, title, description, icon, earned_at")
            .eq("athlete_id", user.id)
            .is("dismissed_at", null)
            .order("earned_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("session_ratings")
            .select("training_plan_id, training_plans!inner(date)")
            .eq("athlete_id", user.id)
            .eq("training_plans.date", date)
        : Promise.resolve({ data: [] }),
      user
        ? supabase.from("athlete_consents").select("health_consent").eq("athlete_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  // Health values (check-in, chart, readiness) only with the athlete's
  // consent — the database refuses to store them otherwise.
  const healthConsent = consentRow?.health_consent === true;

  const completedPlanIds = new Set((ratingRows ?? []).map((r) => r.training_plan_id));

  const badges = (badgeRows ?? []).map((b) => ({
    key: b.badge_key,
    title: b.title,
    description: b.description,
    icon: b.icon,
    earnedAt: b.earned_at,
  }));

  const unreadNotes = (unreadNoteRows ?? []).map((n) => ({
    id: n.id,
    message: n.message,
    createdAt: n.created_at,
    trainerName: n.profiles?.full_name ?? "",
  }));

  // — Trainingsziele — same "this athlete's relevant Mesozyklen" union
  // query as /athlete/mesocycles, narrowed to the ones running today: the
  // Startseite is about what to focus on now, and an athlete may only add
  // own goals to a running Mesozyklus anyway. Past cycles' goals stay
  // readable on /athlete/mesocycles.
  const { data: goalGroupRows } = user
    ? await supabase.from("group_athletes").select("group_id").eq("athlete_id", user.id)
    : { data: [] };
  const goalGroupIds = (goalGroupRows ?? []).map((r) => r.group_id);

  const [{ data: groupMesoRows }, { data: ownMesoRows }] = user
    ? await Promise.all([
        goalGroupIds.length
          ? supabase
              .from("training_mesocycles")
              .select("id, title, start_date, weeks, groups(name)")
              .in("group_id", goalGroupIds)
              .order("start_date", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase
          .from("training_mesocycles")
          .select("id, title, start_date, weeks, groups(name)")
          .eq("athlete_id", user.id)
          .order("start_date", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const allMesocycles = [...(groupMesoRows ?? []), ...(ownMesoRows ?? [])];
  const relevantMesocycles = allMesocycles.filter((m) => isMesocycleCurrent(m.start_date, m.weeks, today));

  const relevantMesoIds = relevantMesocycles.map((m) => m.id);
  const { data: mesoGoalRows } = user && relevantMesoIds.length
    ? await supabase
        .from("mesocycle_goals")
        .select("id, mesocycle_id, text, achieved_at, created_by")
        .eq("athlete_id", user.id)
        .in("mesocycle_id", relevantMesoIds)
        .order("position")
    : { data: [] };
  const goalsByMesocycle = new Map<string, MesocycleGoalGroup["goals"]>();
  for (const g of mesoGoalRows ?? []) {
    const list = goalsByMesocycle.get(g.mesocycle_id) ?? [];
    list.push({ id: g.id, text: g.text, achievedAt: g.achieved_at, ownGoal: g.created_by === user!.id });
    goalsByMesocycle.set(g.mesocycle_id, list);
  }
  const goalGroups: MesocycleGoalGroup[] = relevantMesocycles.map((m) => ({
    mesocycleId: m.id,
    mesocycleTitle: m.title,
    goals: goalsByMesocycle.get(m.id) ?? [],
  }));

  // — Kickoff prompt — in the first week of a Mesozyklus the athlete hasn't
  // set own goals for (and hasn't skipped), ask for 3 goals, with a
  // positive look back at the goals of their previous block.
  const kickoffCandidates =
    user && date === today
      ? relevantMesocycles
          .filter((m) => daysBetween(m.start_date, today) < 7)
          .filter((m) => !(goalsByMesocycle.get(m.id) ?? []).some((g) => g.ownGoal))
      : [];
  const { data: skipRows } = kickoffCandidates.length
    ? await supabase
        .from("mesocycle_goal_prompt_skips")
        .select("mesocycle_id")
        .in(
          "mesocycle_id",
          kickoffCandidates.map((m) => m.id)
        )
    : { data: [] };
  const skipped = new Set((skipRows ?? []).map((r) => r.mesocycle_id));
  const kickoff = kickoffCandidates.find((m) => !skipped.has(m.id)) ?? null;

  let kickoffRecap: KickoffRecap | null = null;
  if (kickoff && user) {
    const earlier = allMesocycles
      .filter((m) => m.start_date < kickoff.start_date)
      .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
    const { data: earlierGoals } = earlier.length
      ? await supabase
          .from("mesocycle_goals")
          .select("id, mesocycle_id, text, achieved_at")
          .eq("athlete_id", user.id)
          .in(
            "mesocycle_id",
            earlier.map((m) => m.id)
          )
          .order("position")
      : { data: [] };
    // The most recent earlier block the athlete actually had goals in.
    const previous = earlier.find((m) => (earlierGoals ?? []).some((g) => g.mesocycle_id === m.id));
    if (previous) {
      const goals = (earlierGoals ?? []).filter((g) => g.mesocycle_id === previous.id);
      kickoffRecap = {
        title: previous.title,
        total: goals.length,
        achieved: goals.filter((g) => g.achieved_at).length,
        openGoals: goals.filter((g) => !g.achieved_at).map((g) => ({ id: g.id, text: g.text })),
      };
    }
  }

  const readiness = computeHealthStatus(recentLogs ?? [], today);
  const trends = computeExerciseTrends(
    (exerciseResultRows ?? [])
      .filter((r) => r.exercises?.name)
      .map((r) => ({
        exercise_id: r.exercise_id,
        exercise_name: r.exercises!.name,
        date: r.date,
        value: r.value,
        unit: r.unit,
        set_type: r.set_type,
      }))
  );

  const showCheckin = healthConsent && date === today && !healthLog;

  return (
    <div>
      <div className="kicker">{formatDateLabel(date)}</div>

      <CoachNotesBanner notes={unreadNotes} />

      <CheckinGate
        showCheckin={showCheckin}
        checkin={
          <>
            <h2 className="mt-1.5 text-[27px] leading-[1.08]">Wie geht es dir heute?</h2>
            <p className="mt-2 text-[13px] leading-[1.55]" style={{ color: "var(--dc-muted)" }}>
              Einmal eintragen — danach zeigt die Startseite nur noch dein Training.
            </p>
            <div className="mt-[22px]">
              <HealthCheckinCard date={date} />
            </div>
          </>
        }
        main={
        <>
          <h2 className="mt-1.5 text-[27px] leading-[1.08]">Training heute</h2>
          {!healthConsent && date === today && (
            <p className="mt-2 text-[13px] leading-[1.5]" style={{ color: "var(--dc-muted)" }}>
              Der tägliche Check-in ist aus, weil keine Einwilligung für Gesundheitswerte vorliegt.{" "}
              <Link href="/consent" className="underline">
                Einwilligung ändern
              </Link>
            </p>
          )}

          <div className="mt-4">
            {(!plans || plans.length === 0) && (
              <div className="p-3.5 text-[13px] leading-[1.5]" style={{ background: "var(--dc-surface)", color: "var(--dc-muted)" }}>
                Für heute ist kein Training geplant.
              </div>
            )}
            {(plans ?? []).map((plan) => (
              <Link key={plan.id} href={`/athlete/plans/${plan.id}`} className="block">
                <div
                  className="mb-2.5 p-3.5"
                  style={{
                    background: "var(--dc-surface)",
                    borderLeft: `2px solid ${plan.scope_type === "group" ? plan.groups?.color ?? "var(--dc-accent)" : "var(--dc-accent)"}`,
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="text-[17px] leading-[1.2]">{plan.title}</span>
                    <span className="flex items-center gap-1.5">
                      {completedPlanIds.has(plan.id) && <span className="tag tag-neutral">✓ Erledigt</span>}
                      <span className={`tag ${plan.category_label?.trim().toLowerCase() === "athletik" ? "tag-accent" : "tag-accent-2"}`}>
                        {plan.category_label?.trim().toLowerCase() === "athletik" ? "Athletik" : "Karate"}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--dc-muted)" }}>
                    {plan.time ? `${plan.time} · ` : ""}
                    {plan.scope_type === "group"
                      ? `Gruppentraining · ${plan.groups?.name ?? ""}`
                      : "Einzeltraining für dich"}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Link href="/athlete/plans/new" className="btn btn-secondary btn-block">
            + Eigenes Training erstellen
          </Link>

          {/* Today's training comes first; goals and the kickoff prompt
              follow below it instead of pushing it off the screen. */}
          <div className="mt-6">
      {user && <GoalsPanel groups={goalGroups} athleteId={user.id} />}

      {kickoff && (
        <GoalKickoffPrompt
          key={kickoff.id}
          mesocycleId={kickoff.id}
          mesocycleTitle={kickoff.title}
          scopeLabel={kickoff.groups?.name ?? "Persönlicher Block"}
          rangeLabel={`${formatDateCompact(kickoff.start_date)}–${formatDateCompact(
            shiftDateISO(kickoff.start_date, kickoff.weeks * 7 - 1)
          )} · ${kickoff.weeks} ${kickoff.weeks === 1 ? "Woche" : "Wochen"}`}
          recap={kickoffRecap}
        />
      )}

          </div>

          {healthConsent && (
          <>
          <div className="kicker mt-7">Deine Werte · 14 Tage</div>
          <div className="mt-3">
            <HealthChart data={recentLogs ?? []} />
          </div>

          <div className="mt-6 p-3.5" style={{ background: "var(--dc-surface)" }}>
            <div className="flex items-center gap-2.5">
              <span className={`tag ${LEVEL_TAG[readiness.level]}`}>{HEALTH_STATUS_LABEL[readiness.level]}</span>
              <span className="text-[13px]" style={{ color: "var(--dc-muted)" }}>
                Trainingsbereitschaft
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-[1.5]">
              {readiness.today
                ? `Heute: Wohlbefinden ${readiness.today.wellbeing ?? "—"}${
                    readiness.today.hrv != null ? ` · HRV ${readiness.today.hrv}` : ""
                  }${readiness.today.resting_hr != null ? ` · Ruhe-HF ${readiness.today.resting_hr}` : ""}`
                : "Noch keine Eingabe für heute."}
            </p>
          </div>
          </>
          )}

          {trends.length > 0 && (
            <>
              <div className="kicker mt-7">Athletik-Fortschritt</div>
              <div className="mt-3">
                <ExerciseTrendList trends={trends.slice(0, 4)} href={(id) => `/athlete/athletik?exercise=${id}`} />
              </div>
              {trends.length > 4 && (
                <Link href="/athlete/athletik" className="btn btn-ghost mt-2">
                  Alle {trends.length} Übungen ansehen
                </Link>
              )}
            </>
          )}

          <div className="kicker mt-7">Erfolge</div>
          <BadgesList badges={badges} dismissible />
        </>
        }
      />

      <div className="mt-6 flex items-center justify-between gap-3 p-2" style={{ background: "var(--dc-surface)" }}>
        <Link href={`/athlete?date=${shiftDateISO(date, -1)}`} className="btn btn-ghost" aria-label="Vorheriger Tag">
          ←
        </Link>
        <span className="text-sm">
          {date === today ? "Heute" : formatDateLabel(date)}
          {date !== today && (
            <>
              {" · "}
              <Link href="/athlete" className="underline">
                zu heute
              </Link>
            </>
          )}
        </span>
        <Link href={`/athlete?date=${shiftDateISO(date, 1)}`} className="btn btn-ghost" aria-label="Nächster Tag">
          →
        </Link>
      </div>
    </div>
  );
}
