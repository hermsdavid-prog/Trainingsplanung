import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanMetaForm } from "@/components/plans/plan-meta-form";
import { PlanTableEditor } from "@/components/plans/plan-table-editor";
import { PlanReadOnlyTable } from "@/components/plans/plan-readonly-table";
import { PlanActions } from "@/components/plans/plan-actions";
import { CopyPlanDialog } from "@/components/plans/copy-plan-dialog";
import { Badge } from "@/components/ui/badge";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const [{ data: plan }, { data: items }, { data: groups }, { data: groupAthletes }, { data: profile }, { data: exerciseLibrary }] =
    await Promise.all([
      supabase
        .from("training_plans")
        .select("id, title, category_label, date, scope_type, group_id, created_by, series_id, groups(name), profiles!training_plans_athlete_id_fkey(full_name)")
        .eq("id", id)
        .single(),
      supabase
        .from("training_plan_items")
        .select(
          "exercise_name, reps_or_duration, sets, rest_time, notes, link_url, exercise_id, section, round_rest, heart_rate_on, heart_rate_off"
        )
        .eq("training_plan_id", id)
        .order("position"),
      supabase.from("groups").select("id, name").order("name"),
      supabase.from("group_athletes").select("athlete_id, profiles(full_name)"),
      currentUser
        ? supabase.from("profiles").select("role").eq("id", currentUser.id).single()
        : Promise.resolve({ data: null }),
      supabase.from("exercises").select("id, name").order("name"),
    ]);

  if (!plan) notFound();

  const canEdit =
    profile?.role === "admin" ||
    plan.created_by === currentUser?.id ||
    plan.scope_type === "group";

  const { count: seriesCount } = plan.series_id
    ? await supabase
        .from("training_plans")
        .select("id", { count: "exact", head: true })
        .eq("series_id", plan.series_id)
    : { count: null };

  const athleteMap = new Map<string, string>();
  for (const row of groupAthletes ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries()).map(([id, full_name]) => ({
    id,
    full_name,
  }));

  const targetLabel =
    plan.scope_type === "group" ? plan.groups?.name : plan.profiles?.full_name;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{plan.title}</h1>
            {!canEdit && <Badge variant="secondary">Nur Ansicht</Badge>}
            {plan.series_id && seriesCount && seriesCount > 1 && (
              <Badge variant="secondary">Serie · {seriesCount} Termine</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Für: {targetLabel ?? "—"} ({plan.scope_type === "group" ? "Gruppe" : "Einzelplan"})
          </p>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">
              Dieses Training wurde vom Athleten selbst erstellt. Du kannst es einsehen, aber
              nicht bearbeiten.
            </p>
          )}
          {canEdit && plan.series_id && seriesCount && seriesCount > 1 && (
            <p className="text-xs text-muted-foreground">
              Übungen werden beim Speichern automatisch auf noch leere Termine dieser
              Serie übertragen.
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-2 sm:items-end">
            <PlanActions planId={plan.id} />
            <CopyPlanDialog planId={plan.id} groups={groups ?? []} athletes={athletes} />
          </div>
        )}
      </div>

      {canEdit ? (
        <>
          <PlanMetaForm
            planId={plan.id}
            categoryLabel={plan.category_label}
            date={plan.date}
          />

          <PlanTableEditor
            planId={plan.id}
            categoryLabel={plan.category_label}
            exerciseLibrary={exerciseLibrary ?? []}
            initialItems={(items ?? []).map((item) => ({
              exercise_name: item.exercise_name,
              reps_or_duration: item.reps_or_duration ?? "",
              sets: item.sets ?? "",
              rest_time: item.rest_time ?? "",
              notes: item.notes ?? "",
              link_url: item.link_url ?? "",
              exercise_id: item.exercise_id,
              section: item.section === "cardio" ? "cardio" : "kraft",
              round_rest: item.round_rest ?? "",
              heart_rate_on: item.heart_rate_on ?? "",
              heart_rate_off: item.heart_rate_off ?? "",
            }))}
          />
        </>
      ) : (
        <PlanReadOnlyTable items={items ?? []} categoryLabel={plan.category_label} />
      )}
    </div>
  );
}
