import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanFeedbackTable } from "@/components/athlete/plan-feedback-table";
import { PlanMetaForm } from "@/components/plans/plan-meta-form";
import { PlanTableEditor } from "@/components/plans/plan-table-editor";
import { PlanActions } from "@/components/plans/plan-actions";
import { CategoryBadge } from "@/components/plans/category-badge";
import { Badge } from "@/components/ui/badge";
import { ChevronLeftIcon } from "lucide-react";

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
      .select("id, title, category_label, date, scope_type, created_by, groups(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("training_plan_items")
      .select("id, exercise_name, reps_or_duration, sets, notes, exercise_id")
      .eq("training_plan_id", id)
      .order("position"),
  ]);

  if (!plan) notFound();

  const isAthletik = plan.category_label?.trim().toLowerCase() === "athletik";
  const exerciseIds = Array.from(
    new Set((items ?? []).map((i) => i.exercise_id).filter((x): x is string => !!x))
  );

  const { data: existingResults } = isAthletik && user && exerciseIds.length
    ? await supabase
        .from("exercise_results")
        .select("exercise_id, value, unit")
        .eq("athlete_id", user.id)
        .eq("date", plan.date)
        .in("exercise_id", exerciseIds)
    : { data: [] };

  const resultsByExercise = Object.fromEntries(
    (existingResults ?? []).map((r) => [r.exercise_id, { value: String(r.value), unit: r.unit ?? "" }])
  );

  const isOwnPlan = plan.created_by === user?.id;

  if (isOwnPlan) {
    const { data: exerciseLibrary } = isAthletik
      ? await supabase.from("exercises").select("id, name").order("name")
      : { data: [] };

    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/athlete"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" /> Zurück zur Übersicht
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{plan.title}</h1>
              <Badge variant="secondary">Eigenes Training</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Nur du und dein Trainer können dieses Training sehen.
            </p>
          </div>
          <PlanActions planId={plan.id} />
        </div>

        <PlanMetaForm
          planId={plan.id}
          title={plan.title}
          categoryLabel={plan.category_label}
          date={plan.date}
        />

        <PlanTableEditor
          planId={plan.id}
          categoryLabel={plan.category_label}
          exerciseLibrary={exerciseLibrary ?? []}
          trackResults
          planDate={plan.date}
          initialItems={(items ?? []).map((item) => ({
            exercise_name: item.exercise_name,
            reps_or_duration: item.reps_or_duration ?? "",
            sets: item.sets ?? "",
            notes: item.notes ?? "",
            exercise_id: item.exercise_id,
            result_value: item.exercise_id ? resultsByExercise[item.exercise_id]?.value ?? "" : "",
            result_unit: item.exercise_id ? resultsByExercise[item.exercise_id]?.unit ?? "" : "",
          }))}
        />
      </div>
    );
  }

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: feedbackRows } = itemIds.length
    ? await supabase
        .from("athlete_feedback")
        .select("training_plan_item_id, done, actual_value")
        .eq("athlete_id", user?.id ?? "")
        .in("training_plan_item_id", itemIds)
    : { data: [] };

  const initialFeedback = Object.fromEntries(
    (feedbackRows ?? []).map((f) => [
      f.training_plan_item_id,
      { done: f.done, actual_value: f.actual_value ?? "" },
    ])
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/athlete"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" /> Zurück zur Übersicht
      </Link>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{plan.title}</h1>
          {plan.category_label && <CategoryBadge label={plan.category_label} />}
        </div>
        <p className="text-sm text-muted-foreground">
          {plan.date} ·{" "}
          {plan.scope_type === "group"
            ? `Gruppentraining · ${plan.groups?.name ?? ""}`
            : "Einzeltraining für dich"}
        </p>
      </div>

      <PlanFeedbackTable
        items={items ?? []}
        initialFeedback={initialFeedback}
        categoryLabel={plan.category_label}
        planDate={plan.date}
        initialResults={resultsByExercise}
      />
    </div>
  );
}
