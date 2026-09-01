import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { estimateOneRepMax } from "@/lib/one-rep-max";

export type BadgeAward = {
  key: string;
  title: string;
  description: string;
  icon: string;
};

type Client = SupabaseClient<Database>;

const SESSION_MILESTONES: { count: number; title: string; description: string; icon: string }[] = [
  { count: 1, title: "Erste Einheit", description: "Das erste Training abgeschlossen.", icon: "🎯" },
  { count: 10, title: "Am Ball", description: "10 Trainingseinheiten abgeschlossen.", icon: "🔥" },
  { count: 25, title: "Dabei geblieben", description: "25 Trainingseinheiten abgeschlossen.", icon: "💪" },
  { count: 50, title: "Halbes Hundert", description: "50 Trainingseinheiten abgeschlossen.", icon: "⭐" },
  { count: 100, title: "Hundert Einheiten", description: "100 Trainingseinheiten abgeschlossen.", icon: "🏆" },
];

const WEEK_STREAKS: { weeks: number; title: string; description: string; icon: string }[] = [
  { weeks: 2, title: "Zwei Wochen am Stück", description: "2 Wochen in Folge trainiert.", icon: "📅" },
  { weeks: 4, title: "Ein Monat dran", description: "4 Wochen in Folge trainiert.", icon: "🗓️" },
  { weeks: 8, title: "Zwei Monate Konstanz", description: "8 Wochen in Folge trainiert.", icon: "🧱" },
  { weeks: 12, title: "Ein Quartal durchgehalten", description: "12 Wochen in Folge trainiert.", icon: "🏔️" },
];

const HEALTH_STREAKS: { days: number; title: string; description: string; icon: string }[] = [
  { days: 7, title: "Eine Woche eingecheckt", description: "7 Tage in Folge Gesundheitsdaten eingetragen.", icon: "✅" },
  { days: 14, title: "Zwei Wochen eingecheckt", description: "14 Tage in Folge Gesundheitsdaten eingetragen.", icon: "✅" },
  { days: 30, title: "Ein Monat eingecheckt", description: "30 Tage in Folge Gesundheitsdaten eingetragen.", icon: "✅" },
];

// Inserts a badge if it hasn't been earned yet. Returns the award if this
// insert was the one that actually created it, null if it already existed
// (ignoreDuplicates makes the insert a silent no-op on the unique-constraint
// conflict rather than an error).
async function tryAwardOnce(
  supabase: Client,
  athleteId: string,
  badgeKey: string,
  title: string,
  description: string,
  icon: string
): Promise<BadgeAward | null> {
  const { data, error } = await supabase
    .from("athlete_badges")
    .upsert(
      { athlete_id: athleteId, badge_key: badgeKey, title, description, icon },
      { onConflict: "athlete_id,badge_key", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (error || !data) return null;
  return { key: badgeKey, title, description, icon };
}

// Every ISO week is identified by its Monday (YYYY-MM-DD), so consecutive
// weeks compare as simple string/date arithmetic without a calendar library.
function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay() || 7; // Sunday (0) -> 7
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Counts consecutive weeks (most recent first) that have at least one entry
// in `weekStarts`, allowing the athlete's current week to still be empty
// (they might just not have trained yet this week) without breaking the
// streak that's already in progress.
function currentWeekStreak(weekStarts: Set<string>, todayIso: string): number {
  let cursor = mondayOf(todayIso);
  if (!weekStarts.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weekStarts.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

// Same idea as currentWeekStreak but at day granularity, for the health
// check-in habit.
function currentDayStreak(days: Set<string>, todayIso: string): number {
  let cursor = todayIso;
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Called after a training session's RPE is saved (i.e. the session counts as
// completed). Checks session-count milestones and the weekly training streak,
// awarding any tier the athlete has newly reached.
export async function checkSessionBadges(supabase: Client, athleteId: string): Promise<BadgeAward[]> {
  const { data: rows } = await supabase
    .from("session_ratings")
    .select("training_plan_id, training_plans(date)")
    .eq("athlete_id", athleteId);

  const dates = (rows ?? [])
    .map((r) => r.training_plans?.date)
    .filter((d): d is string => !!d);

  const awards: BadgeAward[] = [];

  const sessionCount = rows?.length ?? 0;
  for (const tier of SESSION_MILESTONES) {
    if (sessionCount < tier.count) continue;
    const award = await tryAwardOnce(
      supabase,
      athleteId,
      `training_milestone_${tier.count}`,
      tier.title,
      tier.description,
      tier.icon
    );
    if (award) awards.push(award);
  }

  if (dates.length > 0) {
    const weekStarts = new Set(dates.map(mondayOf));
    const todayIso = new Date().toISOString().slice(0, 10);
    const streak = currentWeekStreak(weekStarts, todayIso);
    for (const tier of WEEK_STREAKS) {
      if (streak < tier.weeks) continue;
      const award = await tryAwardOnce(
        supabase,
        athleteId,
        `training_streak_weeks_${tier.weeks}`,
        tier.title,
        tier.description,
        tier.icon
      );
      if (award) awards.push(award);
    }
  }

  return awards;
}

// Called after a daily health check-in is saved. Checks the consecutive-day
// streak of check-ins.
export async function checkHealthBadges(supabase: Client, athleteId: string): Promise<BadgeAward[]> {
  const { data: rows } = await supabase.from("health_logs").select("date").eq("athlete_id", athleteId);

  const days = new Set((rows ?? []).map((r) => r.date));
  if (days.size === 0) return [];

  const todayIso = new Date().toISOString().slice(0, 10);
  const streak = currentDayStreak(days, todayIso);

  const awards: BadgeAward[] = [];
  for (const tier of HEALTH_STREAKS) {
    if (streak < tier.days) continue;
    const award = await tryAwardOnce(
      supabase,
      athleteId,
      `health_streak_${tier.days}`,
      tier.title,
      tier.description,
      tier.icon
    );
    if (award) awards.push(award);
  }
  return awards;
}

// Called after a working-set result is logged. Recomputes the athlete's
// current best for this exercise (same "Bestwert" / estimated-1RM logic as
// src/app/trainer/athletes/page.tsx) and, if it's an improvement, upserts the
// single "current PR" badge row for this exercise.
export async function checkExercisePr(
  supabase: Client,
  athleteId: string,
  exerciseId: string,
  exerciseName: string
): Promise<BadgeAward | null> {
  const { data: rows } = await supabase
    .from("exercise_results")
    .select("value, reps, unit, set_type")
    .eq("athlete_id", athleteId)
    .eq("exercise_id", exerciseId)
    .eq("set_type", "arbeitssatz");

  if (!rows || rows.length === 0) return null;

  const best = Math.max(...rows.map((r) => r.value));
  const bestOneRm = rows.reduce<number | null>((max, r) => {
    const oneRm = r.reps != null ? estimateOneRepMax(r.value, r.reps) : null;
    if (oneRm == null) return max;
    return max == null || oneRm > max ? oneRm : max;
  }, null);
  const unit = rows.find((r) => r.unit)?.unit ?? "kg";
  const badgeKey = `pr:${exerciseId}`;

  const { data: existing } = await supabase
    .from("athlete_badges")
    .select("context")
    .eq("athlete_id", athleteId)
    .eq("badge_key", badgeKey)
    .maybeSingle();

  const previousBest = (existing?.context as { value?: number } | null)?.value ?? null;
  if (previousBest != null && best <= previousBest) return null;

  const title = `Bestleistung: ${exerciseName}`;
  const description =
    bestOneRm != null
      ? `Neuer Bestwert: ${best} ${unit} (geschätztes 1RM: ${bestOneRm} ${unit})`
      : `Neuer Bestwert: ${best} ${unit}`;

  const { error } = await supabase.from("athlete_badges").upsert(
    {
      athlete_id: athleteId,
      badge_key: badgeKey,
      title,
      description,
      icon: "🥇",
      context: { exercise_id: exerciseId, exercise_name: exerciseName, value: best, unit, one_rm: bestOneRm },
      earned_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id,badge_key" }
  );
  if (error) return null;

  return { key: badgeKey, title, description, icon: "🥇" };
}
