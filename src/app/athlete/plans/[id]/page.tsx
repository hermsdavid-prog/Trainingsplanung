import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanFeedbackTable } from "@/components/athlete/plan-feedback-table";
import { PlanTableEditor } from "@/components/plans/plan-table-editor";
import { PlanActions } from "@/components/plans/plan-actions";
import { CopyOwnPlanDialog } from "@/components/plans/copy-own-plan-dialog";
import type { ExerciseSet } from "@/components/athletik/exercise-set-entry-dialog";
import { formatDateShort } from "@/lib/date";

export default async function AthletePlanPage({
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
      .select("id, title, category_label, date, time, scope_type, created_by, groups(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("training_plan_items")
      .select(
        "id, exercise_name, reps_or_duration, sets, rest_time, notes, link_url, exercise_id, section, round_rest, heart_rate_on, heart_rate_off, description, duration_mode"
      )
      .eq("training_plan_id", id)
      .order("position"),
  ]);

  if (!plan) notFound();

  const isAthletik = plan.category_label?.trim().toLowerCase() === "athletik";
  const exerciseIds = Array.from(
    new Set((items ?? []).map((i) => i.exercise_id).filter((x): x is string => !!x))
  );

  const { data: instructionRows } = exerciseIds.length
    ? await supabase
        .from("exercise_instructions")
        .select("exercise_id, steps, video_url")
        .in("exercise_id", exerciseIds)
    : { data: [] };
  const instructionsByExerciseId = new Map((instructionRows ?? []).map((r) => [r.exercise_id, r]));

  const { data: existingResults } = isAthletik && user && exerciseIds.length
    ? await supabase
        .from("exercise_results")
        .select("exercise_id, set_number, value, reps, unit, set_type")
        .eq("athlete_id", user.id)
        .eq("date", plan.date)
        .in("exercise_id", exerciseIds)
        .order("set_number")
    : { data: [] };

  const resultsByExercise: Record<string, { sets: ExerciseSet[]; unit: string }> = {};
  for (const r of existingResults ?? []) {
    const entry = resultsByExercise[r.exercise_id] ?? { sets: [], unit: r.unit ?? "kg" };
    entry.sets.push({
      weight: String(r.value),
      reps: r.reps != null ? String(r.reps) : "",
      type: r.set_type === "aufwaermsatz" ? "aufwaermsatz" : "arbeitssatz",
    });
    entry.unit = r.unit ?? entry.unit;
    resultsByExercise[r.exercise_id] = entry;
  }

  const isOwnPlan = plan.created_by === user?.id;

  if (isOwnPlan) {
    const { data: exerciseLibrary } = await supabase.from("exercises").select("id, name").order("name");

    return (
      <div>
        <div className="mt-6 flex flex-col gap-6">
          <PlanTableEditor
            planId={plan.id}
            categoryLabel={plan.category_label}
            exerciseLibrary={exerciseLibrary ?? []}
            trackResults
            initialTitle={plan.title}
            initialDate={plan.date}
            initialTime={plan.time}
            kicker="Eigenes Training"
            backHref="/athlete"
            subtitle="Nur du und dein Trainer können dieses Training sehen."
            headerActions={
              <>
                <CopyOwnPlanDialog planId={plan.id} />
                <PlanActions planId={plan.id} />
              </>
            }
            initialItems={(items ?? []).map((item) => {
              const instruction = item.exercise_id ? instructionsByExerciseId.get(item.exercise_id) : undefined;
              const section = !isAthletik
                ? "runden"
                : item.section === "cardio"
                  ? "cardio"
                  : item.section === "sprung"
                    ? "sprung"
                    : "kraft";
              return {
                exercise_name: item.exercise_name,
                reps_or_duration: item.reps_or_duration ?? "",
                sets: item.sets ?? "",
                rest_time: item.rest_time ?? "",
                notes: item.notes ?? "",
                link_url: item.link_url ?? "",
                exercise_id: item.exercise_id,
                section,
                round_rest: item.round_rest ?? "",
                heart_rate_on: item.heart_rate_on ?? "",
                heart_rate_off: item.heart_rate_off ?? "",
                description: item.description ?? "",
                duration_mode: item.duration_mode === "duration" ? "duration" : "reps",
                instruction_steps: instruction?.steps ?? [],
                instruction_video_url: instruction?.video_url ?? "",
                result_sets: item.exercise_id ? resultsByExercise[item.exercise_id]?.sets ?? [] : [],
                result_unit: item.exercise_id ? resultsByExercise[item.exercise_id]?.unit ?? "kg" : "kg",
              };
            })}
          />
        </div>
      </div>
    );
  }

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: feedbackRows } = itemIds.length
    ? await supabase
        .from("athlete_feedback")
        .select("training_plan_item_id, actual_value")
        .eq("athlete_id", user?.id ?? "")
        .in("training_plan_item_id", itemIds)
    : { data: [] };

  const initialFeedback = Object.fromEntries(
    (feedbackRows ?? []).map((f) => [
      f.training_plan_item_id,
      { actual_value: f.actual_value ?? "" },
    ])
  );

  return (
    <div>
      <Link href="/athlete" className="btn btn-ghost">
        ← Startseite
      </Link>

      <div className="mt-3 flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div>
          <h2 className="text-[27px] leading-[1.08]">{plan.title}</h2>
          <p className="mt-1 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
            {formatDateShort(plan.date)} ·{" "}
            {plan.scope_type === "group"
              ? `Gruppentraining · ${plan.groups?.name ?? ""}`
              : "Einzeltraining für dich"}
          </p>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          {(items ?? []).length > 0 && (
            <Link href={`/athlete/plans/${plan.id}/session`} className="btn btn-primary">
              Training starten
            </Link>
          )}
          <CopyOwnPlanDialog planId={plan.id} />
        </div>
      </div>

      <div className="mt-5">
        <PlanFeedbackTable
          items={items ?? []}
          initialFeedback={initialFeedback}
          categoryLabel={plan.category_label}
          planId={plan.id}
          planDate={plan.date}
          initialResults={resultsByExercise}
        />
      </div>
    </div>
  );
}
