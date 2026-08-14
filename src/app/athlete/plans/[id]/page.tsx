import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanFeedbackTable } from "@/components/athlete/plan-feedback-table";
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
      .select("id, title, category_label, date, scope_type, groups(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("training_plan_items")
      .select("id, exercise_name, reps_or_duration, sets, notes")
      .eq("training_plan_id", id)
      .order("position"),
  ]);

  if (!plan) notFound();

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
          {plan.category_label && <Badge variant="secondary">{plan.category_label}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {plan.date} ·{" "}
          {plan.scope_type === "group"
            ? `Gruppentraining · ${plan.groups?.name ?? ""}`
            : "Einzeltraining für dich"}
        </p>
      </div>

      <PlanFeedbackTable items={items ?? []} initialFeedback={initialFeedback} />
    </div>
  );
}
