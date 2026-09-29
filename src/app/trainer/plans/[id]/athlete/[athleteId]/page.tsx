import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateLabel } from "@/lib/date";
import { signCardioScreenshots } from "@/lib/cardio-screenshots";

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
      .select("id, exercise_name, exercise_id, section, reps_or_duration, sets, heart_rate_on, heart_rate_off")
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
  const cardioItems = (items ?? []).filter((i) => i.section === "cardio");
  const { data: feedbackRows } = (items ?? []).length
    ? await supabase
        .from("athlete_feedback")
        .select("training_plan_item_id, actual_value, screenshot_path, note")
        .eq("athlete_id", athleteId)
        .in(
          "training_plan_item_id",
          (items ?? []).map((i) => i.id)
        )
    : { data: [] };
  const cardioIdSet = new Set(cardioItems.map((i) => i.id));
  const cardioFeedback = (feedbackRows ?? []).filter((f) => cardioIdSet.has(f.training_plan_item_id));
  // The athlete's "Hinweis an den Trainer" per exercise, in plan order.
  const noteByItem = new Map((feedbackRows ?? []).filter((f) => f.note).map((f) => [f.training_plan_item_id, f.note as string]));
  const athleteNotes = (items ?? [])
    .filter((i) => noteByItem.has(i.id))
    .map((i) => ({ id: i.id, exercise: i.exercise_name, note: noteByItem.get(i.id) as string }));
  const cardioResultByItem = new Map((cardioFeedback ?? []).map((f) => [f.training_plan_item_id, f.actual_value ?? ""]));
  const screenshotUrls = await signCardioScreenshots(
    supabase,
    (cardioFeedback ?? []).map((f) => f.screenshot_path).filter((p): p is string => !!p)
  );
  const screenshotUrlByItem = new Map(
    (cardioFeedback ?? []).map((f) => [f.training_plan_item_id, f.screenshot_path ? screenshotUrls.get(f.screenshot_path) : undefined])
  );
  const exerciseIds = Array.from(new Set(kraftItems.map((i) => i.exercise_id as string)));

  const { data: results } = exerciseIds.length
    ? await supabase
        .from("exercise_results")
        .select("exercise_id, set_number, value, reps, unit, set_type")
        .eq("athlete_id", athleteId)
        .eq("date", plan.date)
        .eq("training_plan_id", id)
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
          <div className="mt-3 text-sm" style={{ color: "var(--dc-muted)" }}>
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

      {athleteNotes.length > 0 && (
        <div className="mt-6 max-w-[900px] p-3.5" style={{ background: "var(--dc-accent-100)" }}>
          <div className="kicker">💬 Hinweise von {athlete.full_name}</div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {athleteNotes.map((n) => (
              <li key={n.id} className="text-[14px] leading-[1.45]" style={{ overflowWrap: "anywhere" }}>
                <strong>{n.exercise}:</strong> {n.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cardioItems.length > 0 && (
        <div className="mt-7 max-w-[900px]">
          <div className="kicker-accent-2">Cardio</div>
          <div className="mt-2 flex flex-col gap-2">
            {cardioItems.map((c) => {
              const result = cardioResultByItem.get(c.id);
              const screenshotUrl = screenshotUrlByItem.get(c.id);
              return (
                <div
                  key={c.id}
                  className="p-3.5"
                  style={{ background: "var(--dc-surface)", border: "1px solid var(--dc-divider)" }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[16px]">
                        {c.exercise_name}
                        {c.reps_or_duration ? <span style={{ color: "var(--dc-muted)" }}> — {c.reps_or_duration}</span> : null}
                      </div>
                      {(c.heart_rate_on || c.heart_rate_off) && (
                        <div className="mt-0.5 text-xs" style={{ color: "var(--dc-muted)" }}>
                          {c.heart_rate_on && `On ${c.heart_rate_on}`}
                          {c.heart_rate_off && ` · Off ${c.heart_rate_off}`}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="kicker-muted">Ergebnis</div>
                      <div className="text-[16px] font-semibold">{result || <span className="font-normal text-muted">noch nichts eingetragen</span>}</div>
                    </div>
                  </div>
                  {screenshotUrl && (
                    <div className="mt-3">
                      <div className="kicker-muted">Herzfrequenz</div>
                      <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block" aria-label="Screenshot in voller Größe öffnen">
                        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                        <img
                          src={screenshotUrl}
                          alt={`Herzfrequenzverlauf ${athlete.full_name}`}
                          className="block max-h-[320px] w-auto max-w-full"
                          style={{ border: "1px solid var(--dc-divider)", background: "#fff" }}
                        />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {exercises.length === 0 ? (
        cardioItems.length === 0 && <p className="mt-8 text-sm text-muted">Für diesen Plan liegen keine Kraftübungen vor.</p>
      ) : (
        <div className="mt-7 max-w-[900px]">
          {exercises.map((ex, i) => (
            <div key={i} className="mb-7">
              <div className="flex items-baseline justify-between gap-3.5">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="m-0 text-[19px]">{ex.exercise_name}</h3>
                  {ex.reps_or_duration && <span className="tag tag-neutral">{ex.reps_or_duration}</span>}
                </div>
                <span className="text-xs" style={{ color: "var(--dc-muted)" }}>
                  {ex.sets.length} {ex.sets.length === 1 ? "Satz" : "Sätze"}
                </span>
              </div>
              {noteByItem.get(ex.id) && (
                <p className="mt-1.5 text-[14px]" style={{ overflowWrap: "anywhere" }}>
                  💬 {noteByItem.get(ex.id)}
                </p>
              )}
              <div
                className="mt-3 grid gap-2 pb-1.5 text-[10px] uppercase"
                style={{
                  gridTemplateColumns: "90px 1fr 1fr 1fr",
                  letterSpacing: ".09em",
                  color: "var(--dc-muted)",
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
                      : "var(--dc-muted)";
                  return (
                    <div
                      key={si}
                      className="grid gap-2 py-2"
                      style={{
                        gridTemplateColumns: "90px 1fr 1fr 1fr",
                        borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 8%, transparent)",
                      }}
                    >
                      <span className="text-xs" style={{ color: "var(--dc-muted)" }}>
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
