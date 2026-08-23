import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateLabel } from "@/lib/date";

const SET_TYPE_LABEL: Record<string, string> = {
  aufwaermsatz: "Aufwärmsatz",
  arbeitssatz: "Arbeitssatz",
};

// The trainer's read-only drill-in into a single athlete's completed sets
// for one plan (design's tAthlet), reached from the plan editor's per-athlete
// list below.
export default async function TrainerAthletePlanPage({
  params,
}: {
  params: Promise<{ id: string; athleteId: string }>;
}) {
  const { id, athleteId } = await params;
  const supabase = await createClient();

  const [{ data: plan }, { data: athlete }, { data: items }, { data: rating }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, title, category_label, date, scope_type, group_id, groups(name)")
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("full_name").eq("id", athleteId).single(),
    supabase
      .from("training_plan_items")
      .select("exercise_name, exercise_id, section, reps_or_duration, sets")
      .eq("training_plan_id", id)
      .order("position"),
    supabase
      .from("session_ratings")
      .select("rpe")
      .eq("training_plan_id", id)
      .eq("athlete_id", athleteId)
      .maybeSingle(),
  ]);

  if (!plan || !athlete) notFound();

  const kraftItems = (items ?? []).filter((i) => i.section === "kraft" && i.exercise_id);
  const exerciseIds = Array.from(new Set(kraftItems.map((i) => i.exercise_id as string)));

  const { data: results } = exerciseIds.length
    ? await supabase
        .from("exercise_results")
        .select("exercise_id, set_number, value, reps, unit, set_type")
        .eq("athlete_id", athleteId)
        .eq("date", plan.date)
        .in("exercise_id", exerciseIds)
        .order("set_number")
    : { data: [] };

  const resultsByExercise = new Map<
    string,
    { setNumber: number; type: string; reps: number | null; value: number; unit: string | null }[]
  >();
  for (const r of results ?? []) {
    const list = resultsByExercise.get(r.exercise_id) ?? [];
    list.push({ setNumber: r.set_number, type: r.set_type, reps: r.reps, value: r.value, unit: r.unit });
    resultsByExercise.set(r.exercise_id, list);
  }

  const exercises = kraftItems.map((item) => {
    const sets = item.exercise_id ? (resultsByExercise.get(item.exercise_id) ?? []) : [];
    const planned = Number(item.sets) || 1;
    return { ...item, sets, planned };
  });

  const totals = exercises.reduce(
    (acc, ex) => {
      acc.total += Math.max(ex.planned, ex.sets.length);
      acc.done += ex.sets.length;
      for (const s of ex.sets) {
        if (s.type === "arbeitssatz" && s.reps != null) {
          acc.tonnage += s.value * s.reps;
          if (s.unit) acc.tonnageUnit = s.unit;
        }
      }
      return acc;
    },
    { total: 0, done: 0, tonnage: 0, tonnageUnit: "kg" }
  );
  const total = totals.total;
  const done = totals.done;
  const tonnage = Math.round(totals.tonnage);
  const tonnageUnit = totals.tonnageUnit;

  const kicker = `${formatDateLabel(plan.date)} · ${plan.title}`;

  return (
    <div>
      <Link href={`/trainer/plans/${plan.id}/edit`} className="btn btn-ghost">
        ← Zurück zur Übersicht
      </Link>
      <div className="mt-3.5 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="kicker">{kicker}</div>
          <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">
            {athlete.full_name}
          </h2>
          <div className="mt-3 text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
            {done} von {total} Sätzen dokumentiert
            {tonnage > 0 ? ` · ${tonnage.toLocaleString("de-DE")} ${tonnageUnit}` : ""}
          </div>
          <div className="mt-1.5 text-sm">
            Belastungsempfinden: <strong>{rating?.rpe ?? "—"}</strong>
          </div>
        </div>
        <Link href={`/trainer/plans/${plan.id}/edit`} className="btn btn-secondary flex-none">
          Plan anpassen
        </Link>
      </div>

      {exercises.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Für diesen Plan liegen keine Kraftübungen vor.</p>
      ) : (
        <div className="mt-7 max-w-[900px]">
          {exercises.map((ex, i) => (
            <div key={i} className="mb-7">
              <div className="flex items-baseline justify-between gap-3.5">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="m-0 text-[19px]">{ex.exercise_name}</h3>
                  {ex.reps_or_duration && <span className="tag tag-neutral">{ex.reps_or_duration}</span>}
                </div>
                <span className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                  {ex.sets.length} {ex.sets.length === 1 ? "Satz" : "Sätze"}
                </span>
              </div>
              <div
                className="mt-3 grid gap-2 pb-1.5 text-[10px] uppercase"
                style={{
                  gridTemplateColumns: "90px 1fr 1fr 1fr",
                  letterSpacing: ".09em",
                  color: "color-mix(in srgb, var(--dc-text) 55%, transparent)",
                  borderBottom: "1px solid var(--dc-divider)",
                }}
              >
                <span>Satz</span>
                <span>Wdh.</span>
                <span>Gewicht</span>
                <span>Vorschlag</span>
              </div>
              {ex.sets.length === 0 && (
                <p className="mt-2 text-xs text-muted">Noch nichts dokumentiert.</p>
              )}
              {(() => {
                const typeCounts: Record<string, number> = {};
                return ex.sets.map((s, si) => {
                  typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
                  const label = `${SET_TYPE_LABEL[s.type] ?? s.type} ${typeCounts[s.type]}`;
                  const tone =
                    s.type === "arbeitssatz"
                      ? "var(--dc-text)"
                      : "color-mix(in srgb, var(--dc-text) 60%, transparent)";
                  return (
                    <div
                      key={si}
                      className="grid gap-2 py-2"
                      style={{
                        gridTemplateColumns: "90px 1fr 1fr 1fr",
                        borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 8%, transparent)",
                      }}
                    >
                      <span className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                        {label}
                      </span>
                      <span className="text-[15px]" style={{ color: tone }}>
                        {s.reps ?? "—"}
                      </span>
                      <span className="text-[15px]" style={{ color: tone }}>
                        {s.value}
                        {s.unit ? ` ${s.unit}` : ""}
                      </span>
                      <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}>
                        {ex.reps_or_duration || "—"}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
