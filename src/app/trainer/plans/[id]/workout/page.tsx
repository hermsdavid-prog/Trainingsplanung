import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateLabel } from "@/lib/date";
import {
  WorkoutOverview,
  type OverviewKraft,
  type OverviewCardio,
  type OverviewKarateRow,
} from "@/components/plans/workout-overview";

// Read-only counterpart to the plan editor — a clean, glanceable view of
// what's in a training (same card layout the athlete's live session uses),
// with no editing and no set/RPE entry. Reachable from the editor via
// "Workout-Ansicht", and back via "Bearbeiten" here.
export default async function TrainerPlanWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: plan }, { data: items }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, title, category_label, date, scope_type, groups(name), profiles!training_plans_athlete_id_fkey(full_name)")
      .eq("id", id)
      .single(),
    supabase
      .from("training_plan_items")
      .select("id, exercise_name, exercise_id, section, reps_or_duration, sets, rest_time, round_rest, heart_rate_on, heart_rate_off, description")
      .eq("training_plan_id", id)
      .order("position"),
  ]);

  if (!plan) notFound();

  const exerciseIds = Array.from(
    new Set((items ?? []).map((i) => i.exercise_id).filter((x): x is string => !!x))
  );
  const { data: instructionRows } = exerciseIds.length
    ? await supabase
        .from("exercise_instructions")
        .select("exercise_id, steps, video_url, video_label")
        .in("exercise_id", exerciseIds)
    : { data: [] };
  const instructionsByExercise: Record<string, { steps: string[]; video_url: string | null; video_label: string | null }> = {};
  for (const row of instructionRows ?? []) {
    instructionsByExercise[row.exercise_id] = {
      steps: row.steps ?? [],
      video_url: row.video_url,
      video_label: row.video_label,
    };
  }

  const isAthletik = plan.category_label?.trim().toLowerCase() === "athletik";
  const kraft: OverviewKraft[] = (items ?? [])
    .filter((i) => i.section === "kraft" || i.section === "sprung")
    .map((i) => ({
      id: i.id,
      name: i.exercise_name,
      spec: i.reps_or_duration ?? "",
      sets: i.sets ?? "",
      restLabel: i.rest_time ?? "",
      exerciseId: i.exercise_id,
    }));
  const cardio: OverviewCardio[] = (items ?? [])
    .filter((i) => i.section === "cardio")
    .map((i) => ({
      id: i.id,
      name: i.exercise_name,
      spec: i.reps_or_duration ?? "",
      restLabel: i.rest_time ?? "",
      on: i.heart_rate_on ?? "",
      off: i.heart_rate_off ?? "",
    }));
  const karateRows: OverviewKarateRow[] = (items ?? [])
    .filter((i) => i.section === "runden")
    .map((i) => ({
      id: i.id,
      name: i.exercise_name,
      desc: i.description ?? "",
      rounds: i.sets ?? "",
      restLabel: i.round_rest ?? i.rest_time ?? "",
      valLabel: i.reps_or_duration ?? "",
      exerciseId: i.exercise_id,
    }));

  const who = plan.scope_type === "group" ? plan.groups?.name : plan.profiles?.full_name;

  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <Link href={`/trainer/plans/${plan.id}/edit`} className="btn btn-ghost">
          ← Zurück
        </Link>
        <Link href={`/trainer/plans/${plan.id}/edit`} className="btn btn-secondary">
          Bearbeiten
        </Link>
      </div>
      <div className="mt-2.5">
        <div className="kicker capitalize">
          {formatDateLabel(plan.date)}
          {who ? ` · ${who}` : ""}
        </div>
        <h2 className="mt-1.5 text-[27px] leading-[1.08]">{plan.title}</h2>
      </div>
      <div className="mt-5 max-w-[560px]">
        <WorkoutOverview
          isAthletik={isAthletik}
          kraft={kraft}
          cardio={cardio}
          karateRows={karateRows}
          instructionsByExercise={instructionsByExercise}
        />
      </div>
    </div>
  );
}
