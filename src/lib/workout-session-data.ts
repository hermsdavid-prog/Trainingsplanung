import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { formatDateLabel } from "@/lib/date";
import { signCardioScreenshots } from "@/lib/cardio-screenshots";
import { exerciseNoteKey } from "@/lib/exercise-note-key";
import { isPerSide, type Side } from "@/lib/per-side";
import { occurrenceOfSet, setNumberBase } from "@/lib/set-numbers";
import { testUnit } from "@/lib/test-unit";
import type { SessionExercise, SessionCardio, SessionKarateRow } from "@/components/athlete/workout-session";

// Everything the live, tap-to-log session (WorkoutSession) needs for one
// plan, loaded for whoever is logging it — the athlete for their own
// training, or a coach training along with a plan themselves. All results
// (sets, cardio, RPE) are read and written under that user's own id.
export async function loadWorkoutSession(supabase: SupabaseClient<Database>, planId: string, userId: string) {
  const [{ data: plan }, { data: items }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, title, category_label, date, scope_type, created_by, athlete_id, groups(name)")
      .eq("id", planId)
      .single(),
    supabase
      .from("training_plan_items")
      .select(
        "id, position, exercise_name, exercise_id, section, reps_or_duration, sets, rest_time, notes, round_rest, heart_rate_on, heart_rate_off, description, link_url"
      )
      .eq("training_plan_id", planId)
      .order("position"),
  ]);

  if (!plan) return null;

  // Adding an exercise mid-session is offered for any training assigned
  // directly to this user — an athlete's own self-built plans and individual
  // trainer-assigned ones alike (training_plan_items_insert RLS covers
  // both: plan.created_by === them, or plan.athlete_id === them). A
  // shared group plan's items stay exactly as the trainer prescribed,
  // since one athlete's ad-hoc addition would otherwise show up for
  // everyone else in that group's session too.
  const canAddExercises = plan.athlete_id === userId;
  const { data: exerciseLibraryRows } = canAddExercises
    ? await supabase.from("exercises").select("id, name").order("name")
    : { data: [] };

  const { data: trainerProfile } = plan.created_by
    ? await supabase.from("profiles").select("full_name").eq("id", plan.created_by).maybeSingle()
    : { data: null };

  const exerciseIds = Array.from(new Set((items ?? []).map((i) => i.exercise_id).filter((x): x is string => !!x)));

  const [{ data: existingResults }, { data: instructions }, { data: rating }, { data: historyRows }] = await Promise.all([
    // Scoped to this plan specifically (not just user+date+exercise) —
    // without training_plan_id here, two plans on the same day that both
    // reference the same exercise would bleed into each other's set list,
    // and confirming a set in one could silently overwrite the other's
    // saved data (same athlete_id/exercise_id/date/set_number).
    exerciseIds.length
      ? supabase
          .from("exercise_results")
          .select("exercise_id, date, set_number, value, reps, unit, set_type, rir, side")
          .eq("athlete_id", userId)
          // By plan only, not by date: after a trainer moved the training
          // to another day, the sets logged before must still show up.
          .eq("training_plan_id", planId)
          .in("exercise_id", exerciseIds)
          .order("set_number")
      : Promise.resolve({ data: [] }),
    exerciseIds.length
      ? supabase
          .from("exercise_instructions")
          .select("exercise_id, short_summary, watch_note, steps, video_url, video_label")
          .in("exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    supabase.from("session_ratings").select("rpe").eq("training_plan_id", planId).eq("athlete_id", userId).maybeSingle(),
    // Weight suggestions: the user's most recent arbeitssatz per exercise
    // from an earlier session, used to prefill the numeric pad so they don't
    // have to remember/re-type what they lifted last time.
    exerciseIds.length
      ? supabase
          .from("exercise_results")
          .select("exercise_id, date, value, reps, set_type")
          .eq("athlete_id", userId)
          .in("exercise_id", exerciseIds)
          .lt("date", plan.date)
          .order("date", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const latestDateByExercise = new Map<string, string>();
  for (const r of historyRows ?? []) {
    if (!latestDateByExercise.has(r.exercise_id)) latestDateByExercise.set(r.exercise_id, r.date);
  }
  const lastKnownByExercise: Record<string, { weight: string; reps: string }> = {};
  for (const r of historyRows ?? []) {
    if (r.set_type !== "arbeitssatz" || r.date !== latestDateByExercise.get(r.exercise_id)) continue;
    const existing = lastKnownByExercise[r.exercise_id];
    if (!existing || Number(r.value) > Number(existing.weight)) {
      lastKnownByExercise[r.exercise_id] = {
        weight: String(r.value),
        reps: r.reps != null ? String(r.reps) : "",
      };
    }
  }

  const kraftItems = (items ?? []).filter((i) => i.section === "kraft" || i.section === "sprung");
  const cardioItems = (items ?? []).filter((i) => i.section === "cardio");
  const roundItems = (items ?? []).filter((i) => i.section === "runden");

  const resultsByExercise = new Map<
    string,
    { setNumber: number; type: "aufwaermsatz" | "arbeitssatz"; reps: string; weight: string; rir: string; side: Side | null; date: string }[]
  >();
  for (const r of existingResults ?? []) {
    const list = resultsByExercise.get(r.exercise_id) ?? [];
    list.push({
      setNumber: r.set_number,
      type: r.set_type === "aufwaermsatz" ? "aufwaermsatz" : "arbeitssatz",
      reps: r.reps != null ? String(r.reps) : "",
      weight: String(r.value),
      rir: r.rir != null ? String(r.rir) : "",
      side: r.side === "links" || r.side === "rechts" ? r.side : null,
      date: r.date,
    });
    resultsByExercise.set(r.exercise_id, list);
  }

  const exerciseUnitByExercise = new Map<string, string>();
  for (const r of existingResults ?? []) {
    if (r.unit) exerciseUnitByExercise.set(r.exercise_id, r.unit);
  }

  // Per-item feedback (cardio result/screenshot, the note to the trainer)
  // and the user's private per-exercise notes from earlier sessions.
  const allItems = items ?? [];
  const noteKeyByItem = new Map(allItems.map((i) => [i.id, exerciseNoteKey(i.exercise_id, i.exercise_name)]));
  const [{ data: feedbackRows }, { data: selfNoteRows }] = await Promise.all([
    allItems.length
      ? supabase
          .from("athlete_feedback")
          .select("training_plan_item_id, actual_value, screenshot_path, note")
          .eq("athlete_id", userId)
          .in(
            "training_plan_item_id",
            allItems.map((i) => i.id)
          )
      : Promise.resolve({ data: [] }),
    allItems.length
      ? supabase
          .from("athlete_exercise_notes")
          .select("exercise_key, text, updated_at")
          .eq("athlete_id", userId)
          .in("exercise_key", [...new Set(noteKeyByItem.values())])
      : Promise.resolve({ data: [] }),
  ]);
  const coachNoteByItem = new Map((feedbackRows ?? []).map((f) => [f.training_plan_item_id, f.note ?? ""]));
  const selfNoteByKey = new Map((selfNoteRows ?? []).map((n) => [n.exercise_key, { text: n.text, updatedAt: n.updated_at }]));
  const noteFields = (itemId: string) => {
    const noteKey = noteKeyByItem.get(itemId) ?? itemId;
    return { noteKey, selfNote: selfNoteByKey.get(noteKey) ?? null, coachNote: coachNoteByItem.get(itemId) ?? "" };
  };

  // The same exercise more than once in the plan: each occurrence has its
  // own block of set numbers (see lib/set-numbers).
  const occurrenceCount = new Map<string, number>();
  for (const item of kraftItems) {
    if (item.exercise_id) occurrenceCount.set(item.exercise_id, (occurrenceCount.get(item.exercise_id) ?? 0) + 1);
  }
  const occurrenceSeen = new Map<string, number>();
  const occurrenceOfItem = new Map<string, number>();
  for (const item of kraftItems) {
    if (!item.exercise_id) continue;
    const k = occurrenceSeen.get(item.exercise_id) ?? 0;
    occurrenceSeen.set(item.exercise_id, k + 1);
    occurrenceOfItem.set(item.id, k);
  }
  const setsForItem = (item: { id: string; exercise_id: string | null }) => {
    if (!item.exercise_id) return [];
    const k = occurrenceOfItem.get(item.id) ?? 0;
    const total = occurrenceCount.get(item.exercise_id) ?? 1;
    return (resultsByExercise.get(item.exercise_id) ?? []).filter((r) => occurrenceOfSet(r.setNumber, total) === k);
  };

  const exercises: SessionExercise[] = kraftItems.map((item) => ({
    itemId: item.id,
    exerciseId: item.exercise_id,
    name: item.exercise_name,
    spec: item.reps_or_duration ?? "",
    sets: item.sets ?? "",
    restLabel: item.rest_time ?? "",
    restSeconds: parseRest(item.rest_time),
    note: item.notes ?? "",
    perSide: isPerSide(item.reps_or_duration),
    // A test (Leistungsdiagnostik) is logged in the plan's Messgröße, e.g. cm.
    isTest: item.section === "sprung",
    unit:
      item.section === "sprung"
        ? testUnit(item.reps_or_duration)
        : (item.exercise_id ? exerciseUnitByExercise.get(item.exercise_id) : undefined) || "kg",
    linkUrl: item.link_url ?? "",
    initialSets: setsForItem(item),
    setNumberBase: setNumberBase(occurrenceOfItem.get(item.id) ?? 0),
    ...noteFields(item.id),
  }));

  const cardioIdSet = new Set(cardioItems.map((i) => i.id));
  const cardioFeedback = (feedbackRows ?? []).filter((f) => cardioIdSet.has(f.training_plan_item_id));
  const cardioResultByItem = new Map((cardioFeedback ?? []).map((f) => [f.training_plan_item_id, f.actual_value ?? ""]));
  const screenshotUrls = await signCardioScreenshots(
    supabase,
    (cardioFeedback ?? []).map((f) => f.screenshot_path).filter((p): p is string => !!p)
  );
  const screenshotUrlByItem = new Map(
    (cardioFeedback ?? []).map((f) => [
      f.training_plan_item_id,
      f.screenshot_path ? (screenshotUrls.get(f.screenshot_path) ?? null) : null,
    ])
  );

  const cardio: SessionCardio[] = cardioItems.map((item) => ({
    itemId: item.id,
    name: item.exercise_name,
    spec: item.reps_or_duration ?? "",
    restLabel: item.rest_time ?? "",
    on: item.heart_rate_on ?? "",
    off: item.heart_rate_off ?? "",
    note: item.notes ?? "",
    result: cardioResultByItem.get(item.id) ?? "",
    screenshotUrl: screenshotUrlByItem.get(item.id) ?? null,
    ...noteFields(item.id),
  }));

  const karateRows: SessionKarateRow[] = roundItems.map((item) => ({
    itemId: item.id,
    exerciseId: item.exercise_id,
    name: item.exercise_name,
    desc: item.description ?? "",
    note: item.notes ?? "",
    linkUrl: item.link_url ?? "",
    rounds: Number(item.sets) || 3,
    restLabel: item.round_rest ?? item.rest_time ?? "",
    valLabel: item.reps_or_duration ?? "",
    ...noteFields(item.id),
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

  const planKicker = `${formatDateLabel(plan.date)}${trainerProfile?.full_name ? ` · ${trainerProfile.full_name}` : ""}${
    plan.scope_type === "group" && plan.groups?.name ? ` · ${plan.groups.name}` : ""
  }`;

  return {
    athleteId: userId,
    planId: plan.id,
    planDate: plan.date,
    planTitle: plan.title,
    planKicker,
    categoryLabel: plan.category_label ?? "",
    exercises,
    cardio,
    karateRows,
    instructionsByExercise,
    initialRpe: rating?.rpe ?? null,
    lastKnownByExercise,
    canAddExercises,
    exerciseLibrary: exerciseLibraryRows ?? [],
  };
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
