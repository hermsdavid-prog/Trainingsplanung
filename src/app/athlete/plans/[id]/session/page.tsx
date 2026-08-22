import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateLabel } from "@/lib/date";
import {
  WorkoutSession,
  type SessionExercise,
  type SessionCardio,
  type SessionKarateRow,
} from "@/components/athlete/workout-session";

// The live, tap-to-log training session for a single day's assigned plan —
// the mobile-first counterpart to the read-only PlanFeedbackTable. Athletik
// plans get the full set-by-set logging flow (numeric keypad, rest timer,
// exercise switching); Sportartspezifisch ("Karate" in the design source)
// plans get a lighter round-tracking view. Both end with the same
// Belastungsempfinden (RPE) step.
export default async function AthleteWorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plan }, { data: items }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, title, category_label, date, scope_type, created_by, groups(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("training_plan_items")
      .select(
        "id, position, exercise_name, exercise_id, section, reps_or_duration, sets, rest_time, notes, round_rest, heart_rate_on, heart_rate_off, description"
      )
      .eq("training_plan_id", id)
      .order("position"),
  ]);

  if (!plan || !user) notFound();

  const { data: trainerProfile } = plan.created_by
    ? await supabase.from("profiles").select("full_name").eq("id", plan.created_by).maybeSingle()
    : { data: null };

  const exerciseIds = Array.from(
    new Set((items ?? []).map((i) => i.exercise_id).filter((x): x is string => !!x))
  );

  const [{ data: existingResults }, { data: instructions }, { data: rating }] = await Promise.all([
    exerciseIds.length
      ? supabase
          .from("exercise_results")
          .select("exercise_id, set_number, value, reps, unit, set_type")
          .eq("athlete_id", user.id)
          .eq("date", plan.date)
          .in("exercise_id", exerciseIds)
          .order("set_number")
      : Promise.resolve({ data: [] }),
    exerciseIds.length
      ? supabase
          .from("exercise_instructions")
          .select("exercise_id, short_summary, watch_note, steps, video_url, video_label")
          .in("exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("session_ratings")
      .select("rpe")
      .eq("training_plan_id", id)
      .eq("athlete_id", user.id)
      .maybeSingle(),
  ]);

  const kraftItems = (items ?? []).filter((i) => i.section === "kraft" || i.section === "sprung");
  const cardioItems = (items ?? []).filter((i) => i.section === "cardio");
  const roundItems = (items ?? []).filter((i) => i.section === "runden");

  const resultsByExercise = new Map<string, { setNumber: number; type: "aufwaermsatz" | "arbeitssatz"; reps: string; weight: string }[]>();
  for (const r of existingResults ?? []) {
    const list = resultsByExercise.get(r.exercise_id) ?? [];
    list.push({
      setNumber: r.set_number,
      type: r.set_type === "aufwaermsatz" ? "aufwaermsatz" : "arbeitssatz",
      reps: r.reps != null ? String(r.reps) : "",
      weight: String(r.value),
    });
    resultsByExercise.set(r.exercise_id, list);
  }

  const exerciseUnitByExercise = new Map<string, string>();
  for (const r of existingResults ?? []) {
    if (r.unit) exerciseUnitByExercise.set(r.exercise_id, r.unit);
  }

  const exercises: SessionExercise[] = kraftItems.map((item) => ({
    itemId: item.id,
    exerciseId: item.exercise_id,
    name: item.exercise_name,
    spec: item.reps_or_duration ?? "",
    sets: item.sets ?? "",
    restLabel: item.rest_time ?? "",
    restSeconds: parseRest(item.rest_time),
    note: item.notes ?? "",
    unit: (item.exercise_id ? exerciseUnitByExercise.get(item.exercise_id) : undefined) || "kg",
    initialSets: (item.exercise_id ? resultsByExercise.get(item.exercise_id) : undefined) ?? [],
  }));

  const cardio: SessionCardio[] = cardioItems.map((item) => ({
    itemId: item.id,
    name: item.exercise_name,
    spec: item.reps_or_duration ?? "",
    restLabel: item.rest_time ?? "",
    on: item.heart_rate_on ?? "",
    off: item.heart_rate_off ?? "",
    note: item.notes ?? "",
  }));

  const karateRows: SessionKarateRow[] = roundItems.map((item) => ({
    itemId: item.id,
    name: item.exercise_name,
    desc: item.description ?? item.notes ?? "",
    rounds: Number(item.sets) || 3,
    restLabel: item.round_rest ?? item.rest_time ?? "",
    valLabel: item.reps_or_duration ?? "",
  }));

  const instructionsByExercise: Record<
    string,
    { short_summary: string | null; watch_note: string | null; steps: string[]; video_url: string | null; video_label: string | null }
  > = {};
  for (const row of instructions ?? []) {
    instructionsByExercise[row.exercise_id] = {
      short_summary: row.short_summary,
      watch_note: row.watch_note,
      steps: row.steps ?? [],
      video_url: row.video_url,
      video_label: row.video_label,
    };
  }

  const kicker = `${formatDateLabel(plan.date)}${trainerProfile?.full_name ? ` · ${trainerProfile.full_name}` : ""}${
    plan.scope_type === "group" && plan.groups?.name ? ` · ${plan.groups.name}` : ""
  }`;

  return (
    <WorkoutSession
      planId={plan.id}
      planDate={plan.date}
      planTitle={plan.title}
      planKicker={kicker}
      backHref={`/athlete/plans/${plan.id}`}
      categoryLabel={plan.category_label ?? ""}
      exercises={exercises}
      cardio={cardio}
      karateRows={karateRows}
      instructionsByExercise={instructionsByExercise}
      initialRpe={rating?.rpe ?? null}
    />
  );
}

function parseRest(label: string | null): number {
  if (!label) return 0;
  const m = label.match(/(\d+)\s*[:.]\s*(\d{1,2})/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const secOnly = label.match(/(\d+)\s*(sek|s)\b/i);
  if (secOnly) return Number(secOnly[1]);
  const minOnly = label.match(/(\d+)\s*min/i);
  if (minOnly) return Number(minOnly[1]) * 60;
  return 0;
}
