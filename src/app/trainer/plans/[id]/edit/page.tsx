import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanTableEditor } from "@/components/plans/plan-table-editor";
import { PlanReadOnlyTable } from "@/components/plans/plan-readonly-table";
import { PlanActions } from "@/components/plans/plan-actions";
import { CopyPlanDialog } from "@/components/plans/copy-plan-dialog";

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
        .select("id, title, category_label, date, time, scope_type, group_id, athlete_id, created_by, series_id, groups(name), profiles!training_plans_athlete_id_fkey(full_name)")
        .eq("id", id)
        .single(),
      supabase
        .from("training_plan_items")
        .select(
          "exercise_name, reps_or_duration, sets, rest_time, notes, link_url, exercise_id, section, round_rest, heart_rate_on, heart_rate_off, description, duration_mode"
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

  const isAthletik = plan.category_label?.trim().toLowerCase() === "athletik";

  // The Sportartspezifisch row editor's "Anweisung und Link" panel edits
  // exercise_instructions (steps + video), shared per exercise_id — preload
  // it here for every exercise this plan already references.
  const instructionExerciseIds = Array.from(
    new Set((items ?? []).map((i) => i.exercise_id).filter((x): x is string => !!x))
  );
  const { data: instructionRows } = instructionExerciseIds.length
    ? await supabase
        .from("exercise_instructions")
        .select("exercise_id, steps, video_url")
        .in("exercise_id", instructionExerciseIds)
    : { data: [] };
  const instructionsByExerciseId = new Map(
    (instructionRows ?? []).map((r) => [r.exercise_id, r])
  );

  const canEdit =
    profile?.role === "admin" ||
    plan.created_by === currentUser?.id ||
    plan.scope_type === "group";

  // A trainer can already read this plan and its exercise_results (RLS
  // grants that for any athlete in one of their groups, regardless of who
  // created it) but couldn't get to the page that actually shows the
  // logged sets/reps/weights/RPE for a self-created (non-group) plan —
  // only the planned structure via PlanReadOnlyTable below.
  const { data: rpeRow } = !canEdit
    ? await supabase
        .from("session_ratings")
        .select("rpe")
        .eq("training_plan_id", id)
        .eq("athlete_id", plan.athlete_id ?? "")
        .maybeSingle()
    : { data: null };

  const { count: seriesCount } = plan.series_id
    ? await supabase
        .from("training_plans")
        .select("id", { count: "exact", head: true })
        .eq("series_id", plan.series_id)
    : { count: null };

  // Athlete-by-athlete completion overview, shown for any group-assigned
  // plan (Athletik or Sportartspezifisch) — the RPE ("Belastungsempfinden")
  // an athlete logs when they tap "Training beenden" applies to both, so a
  // trainer needs to see it regardless of category. The per-exercise
  // "Sätze ansehen" drill-in is still most useful for Athletik, but stays
  // harmless (and shows the same RPE) for Karate plans too.
  const { data: planGroupAthletes } =
    plan.scope_type === "group" && plan.group_id
      ? await supabase
          .from("group_athletes")
          .select("athlete_id, profiles(full_name)")
          .eq("group_id", plan.group_id)
          .order("athlete_id")
      : { data: null };

  const { data: ratingRows } =
    planGroupAthletes && planGroupAthletes.length > 0
      ? await supabase.from("session_ratings").select("athlete_id, rpe").eq("training_plan_id", id)
      : { data: null };
  const rpeByAthlete = new Map((ratingRows ?? []).map((r) => [r.athlete_id, r.rpe]));

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

  const isKarate = plan.category_label?.trim() === "Sportartspezifisch";
  const kicker = isAthletik
    ? "Gruppenplan · ohne Gewichte, die sind individuell"
    : isKarate
      ? "Sportartspezifisch · Karate"
      : "Sportartspezifisch";
  const backHref = `/trainer/plans?type=${encodeURIComponent(plan.category_label)}`;

  return (
    <div>
      {!canEdit && (
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">{plan.title}</h2>
              <span className="tag tag-outline">Nur Ansicht</span>
              {plan.series_id && seriesCount && seriesCount > 1 && (
                <span className="tag tag-neutral">Serie · {seriesCount} Termine</span>
              )}
            </div>
            <p className="mt-2 text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
              Für: {targetLabel ?? "—"} ({plan.scope_type === "group" ? "Gruppe" : "Einzelplan"})
            </p>
            <p className="mt-1 text-xs text-muted">
              Dieses Training wurde vom Athleten selbst erstellt. Du kannst es einsehen, aber
              nicht bearbeiten.
            </p>
            <p className="mt-1.5 text-sm">
              Belastungsempfinden: <strong>{rpeRow?.rpe ?? "—"}</strong>
            </p>
          </div>
          {isAthletik && plan.athlete_id && (
            <Link
              href={`/trainer/plans/${plan.id}/athlete/${plan.athlete_id}`}
              className="btn btn-secondary flex-none"
            >
              Sätze, Wdh. und Gewichte ansehen
            </Link>
          )}
        </div>
      )}

      {canEdit ? (
        <div className="mt-2 flex flex-col gap-7">
          <PlanTableEditor
            planId={plan.id}
            categoryLabel={plan.category_label}
            exerciseLibrary={exerciseLibrary ?? []}
            initialTitle={plan.title}
            initialDate={plan.date}
            initialTime={plan.time}
            kicker={kicker}
            backHref={backHref}
            allowSaveAsTemplate
            subtitle={`Für: ${targetLabel ?? "—"} (${plan.scope_type === "group" ? "Gruppe" : "Einzelplan"})${
              plan.series_id && seriesCount && seriesCount > 1
                ? " · Übungen werden beim Speichern automatisch auf noch leere Termine dieser Serie übertragen."
                : ""
            }`}
            badges={
              plan.series_id && seriesCount && seriesCount > 1 ? (
                <span className="tag tag-neutral">Serie · {seriesCount} Termine</span>
              ) : undefined
            }
            headerActions={
              <>
                <PlanActions planId={plan.id} />
                <CopyPlanDialog planId={plan.id} groups={groups ?? []} athletes={athletes} />
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
              };
            })}
          />

          {planGroupAthletes && planGroupAthletes.length > 0 && (
            <div>
              <div className="kicker-muted mb-2">Athleten in dieser Gruppe</div>
              <div className="overflow-x-auto">
              <table className="table" style={{ minWidth: 420 }}>
                <thead>
                  <tr>
                    <th>Athlet</th>
                    <th>Belastungsempfinden</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {planGroupAthletes.map((row) => {
                    const rpe = rpeByAthlete.get(row.athlete_id);
                    return (
                      <tr key={row.athlete_id}>
                        <td className="text-[15px]">{row.profiles?.full_name ?? "—"}</td>
                        <td>
                          {rpe != null ? (
                            <span className="tag tag-neutral">{rpe} / 10</span>
                          ) : (
                            <span className="text-xs text-muted">Noch keine Angabe</span>
                          )}
                        </td>
                        <td className="text-right">
                          <Link href={`/trainer/plans/${plan.id}/athlete/${row.athlete_id}`} className="btn btn-ghost">
                            Sätze ansehen
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-7">
          <PlanReadOnlyTable items={items ?? []} categoryLabel={plan.category_label} />
        </div>
      )}
    </div>
  );
}
