"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { weeklyOccurrences } from "@/lib/date";
import { PLAN_TYPES, isValidPlanType } from "@/lib/plan-type";
import type { Database } from "@/lib/supabase/types";

export type ActionResult = { error?: string };

type PlanScope = Database["public"]["Enums"]["plan_scope"];

async function requireTrainerOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "trainer") {
    throw new Error("Keine Berechtigung.");
  }

  return { supabase, userId: user.id, role: profile.role };
}

async function requireAthlete() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "athlete") {
    throw new Error("Keine Berechtigung.");
  }

  return { supabase, userId: user.id };
}

// Mirrors the training_plans_update / training_plan_items_* RLS policies so the
// app can show a clean error instead of a silent no-op update. Admin, the
// plan's creator, or the trainer of its group may edit. An athlete's own
// self-created plan is editable by that athlete, or by a trainer who shares
// a group with them (e.g. to fix a typo'd exercise name) — matching the
// "every trainer of a group manages all its athletes' data" model already
// used for reading this data.
async function requirePlanEditAccess(planId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Kein Profil gefunden.");

  const { data: plan } = await supabase
    .from("training_plans")
    .select("id, created_by, group_id, athlete_id")
    .eq("id", planId)
    .single();
  if (!plan) throw new Error("Plan nicht gefunden.");

  let canEdit = profile.role === "admin" || plan.created_by === user.id;

  if (!canEdit && profile.role === "trainer" && plan.group_id) {
    const { data: trainerGroup } = await supabase
      .from("group_trainers")
      .select("group_id")
      .eq("trainer_id", user.id)
      .eq("group_id", plan.group_id)
      .maybeSingle();
    canEdit = !!trainerGroup;
  }

  if (!canEdit && profile.role === "trainer" && plan.athlete_id) {
    const { data: athleteGroups } = await supabase
      .from("group_athletes")
      .select("group_id")
      .eq("athlete_id", plan.athlete_id);
    const groupIds = (athleteGroups ?? []).map((g) => g.group_id);
    if (groupIds.length > 0) {
      const { data: trainerGroups } = await supabase
        .from("group_trainers")
        .select("group_id")
        .eq("trainer_id", user.id)
        .in("group_id", groupIds);
      canEdit = (trainerGroups ?? []).length > 0;
    }
  }

  if (!canEdit) throw new Error("Keine Berechtigung, diesen Plan zu bearbeiten.");

  return { supabase, userId: user.id, role: profile.role };
}

export async function createPlanAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, userId } = await requireTrainerOrAdmin();

  const categoryLabelRaw = String(formData.get("category_label") ?? "").trim();
  const categoryLabel = isValidPlanType(categoryLabelRaw) ? categoryLabelRaw : PLAN_TYPES[0];
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "").trim() || null;
  const scopeType = String(formData.get("scope_type") ?? "") as PlanScope;
  const groupIds = formData.getAll("group_ids").map(String).filter(Boolean);
  const athleteIds = formData.getAll("athlete_ids").map(String).filter(Boolean);
  const repeatUntil = String(formData.get("repeat_until") ?? "") || null;
  const templateId = String(formData.get("template_id") ?? "") || null;

  if (!title) {
    return { error: "Bitte einen Titel angeben." };
  }
  if (!date) {
    return { error: "Bitte ein Datum angeben." };
  }
  if (scopeType === "group" && groupIds.length === 0) {
    return { error: "Bitte mindestens eine Gruppe auswählen." };
  }
  if (scopeType === "athlete" && athleteIds.length === 0) {
    return { error: "Bitte mindestens einen Athleten auswählen." };
  }
  if (repeatUntil && repeatUntil < date) {
    return { error: "Das Wiederholungsdatum muss nach dem Startdatum liegen." };
  }

  const dates = repeatUntil ? weeklyOccurrences(date, repeatUntil) : [date];
  const targetIds = scopeType === "group" ? groupIds : athleteIds;
  // One plan per (Ziel × Termin) combination. All share one series_id when
  // there's more than one, the same mechanism weekly-repeat already used —
  // it makes savePlanItemsAction's existing "propagate to still-empty
  // siblings" behavior apply here too, so filling in the exercise table on
  // the first plan (after the redirect below) fills in every other
  // group's/athlete's copy for free instead of leaving them blank.
  const seriesId = dates.length * targetIds.length > 1 ? randomUUID() : null;

  const rows = targetIds.flatMap((targetId) =>
    dates.map((occurrenceDate) => ({
      title,
      category_label: categoryLabel,
      date: occurrenceDate,
      time,
      scope_type: scopeType,
      group_id: scopeType === "group" ? targetId : null,
      athlete_id: scopeType === "athlete" ? targetId : null,
      series_id: seriesId,
      created_by: userId,
    }))
  );

  const { data: plans, error } = await supabase
    .from("training_plans")
    .insert(rows)
    .select("id, date")
    .order("date");

  if (error || !plans || plans.length === 0) {
    return { error: "Plan konnte nicht angelegt werden." };
  }

  // "Vorlage wählen" step 1 — prefill the new plan's exercise table from the
  // chosen plan_templates row so the trainer lands in a pre-populated editor
  // instead of a blank one.
  if (templateId) {
    await applyTemplateToNewPlan(supabase, plans[0].id, templateId);
  }

  redirect(`/trainer/plans/${plans[0].id}/edit`);
}

export async function createOwnPlanAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, userId } = await requireAthlete();

  const categoryLabelRaw = String(formData.get("category_label") ?? "").trim();
  const categoryLabel = isValidPlanType(categoryLabelRaw) ? categoryLabelRaw : PLAN_TYPES[0];
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "").trim() || null;
  const templateId = String(formData.get("template_id") ?? "") || null;

  if (!title) {
    return { error: "Bitte einen Titel angeben." };
  }
  if (!date) {
    return { error: "Bitte ein Datum angeben." };
  }

  const { data: plan, error } = await supabase
    .from("training_plans")
    .insert({
      title,
      category_label: categoryLabel,
      date,
      time,
      scope_type: "athlete",
      athlete_id: userId,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !plan) {
    return { error: "Plan konnte nicht angelegt werden." };
  }

  // "Vorlage wählen" step 1 (athlete equivalent of the trainer flow) —
  // prefill the new plan's exercise table from the chosen plan_templates
  // row, same as createPlanAction does for trainers.
  if (templateId) {
    await applyTemplateToNewPlan(supabase, plan.id, templateId);
  }

  revalidatePath("/athlete");
  redirect(`/athlete/plans/${plan.id}`);
}

// Called directly (not via useActionState) from the combined "Plan speichern"
// button in PlanTableEditor, alongside savePlanItemsAction, so the whole
// editor (rahmendaten + rows) saves in one action. category_label is fixed
// at creation time (implied by the Athletik/Karate nav entry point that was
// used to create the plan) and isn't editable here.
export async function updatePlanMetaAction(
  planId: string,
  meta: { title: string; date: string; time: string }
): Promise<ActionResult> {
  const { supabase } = await requirePlanEditAccess(planId);

  const title = meta.title.trim();
  const date = meta.date;
  const time = meta.time.trim() || null;

  if (!title) {
    return { error: "Bitte einen Titel angeben." };
  }
  if (!date) {
    return { error: "Bitte ein Datum angeben." };
  }

  const { error } = await supabase
    .from("training_plans")
    .update({ title, date, time })
    .eq("id", planId);

  if (error) return { error: "Änderungen konnten nicht gespeichert werden." };

  revalidatePath(`/trainer/plans/${planId}/edit`);
  revalidatePath("/trainer/plans");
  revalidatePath(`/athlete/plans/${planId}`);
  revalidatePath("/athlete");
  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}

type PlanItemInput = {
  exercise_name: string;
  reps_or_duration: string;
  sets: string;
  rest_time: string;
  notes: string;
  link_url: string;
  exercise_id?: string | null;
  section?: "kraft" | "cardio" | "sprung" | "runden";
  round_rest?: string;
  heart_rate_on?: string;
  heart_rate_off?: string;
  description?: string;
  duration_mode?: "reps" | "duration" | null;
};

// Shared by createPlanAction (trainer) and createOwnPlanAction (athlete) —
// both let the user pick a plan_templates row in step 1 of their creation
// flow and carry its id through as template_id. This turns the template's
// stored jsonb items back into PlanItemInput rows for savePlanItemsAction.
function parseTemplateItems(rawItemsValue: unknown): PlanItemInput[] {
  const rawItems: unknown[] = Array.isArray(rawItemsValue) ? rawItemsValue : [];
  return rawItems
    .filter((it): it is Record<string, unknown> => typeof it === "object" && it !== null && !Array.isArray(it))
    .map((it) => ({
      exercise_name: String(it.exercise_name ?? ""),
      reps_or_duration: String(it.reps_or_duration ?? ""),
      sets: String(it.sets ?? ""),
      rest_time: String(it.rest_time ?? ""),
      notes: String(it.notes ?? ""),
      link_url: String(it.link_url ?? ""),
      section: (it.section as PlanItemInput["section"]) ?? "kraft",
      round_rest: String(it.round_rest ?? ""),
      heart_rate_on: String(it.heart_rate_on ?? ""),
      heart_rate_off: String(it.heart_rate_off ?? ""),
      description: String(it.description ?? ""),
      duration_mode: (it.duration_mode as PlanItemInput["duration_mode"]) ?? null,
    }));
}

async function applyTemplateToNewPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planId: string,
  templateId: string
) {
  const { data: template } = await supabase
    .from("plan_templates")
    .select("items")
    .eq("id", templateId)
    .maybeSingle();
  const templateItems = parseTemplateItems(template?.items);
  if (templateItems.length > 0) {
    await savePlanItemsAction(planId, templateItems);
  }
}

// Prefix bare domains/paths with https:// so links always navigate instead
// of being interpreted as a relative path on this site.
function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Resolves a (trimmed) exercise name to a library exercise_id, auto-creating
// it if it doesn't exist yet. Case-insensitive lookup via ilike, with a
// retry-after-insert-conflict to handle two requests racing to create the
// same not-yet-existing name at once — including two different-case
// spellings of the same name, since the underlying unique index is
// case-sensitive while this lookup isn't.
async function resolveOrCreateExerciseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string
): Promise<{ exerciseId?: string; error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Kein Übungsname angegeben." };

  const escapedName = trimmed.replace(/[%_\\]/g, (char) => `\\${char}`);
  const { data: existing } = await supabase
    .from("exercises")
    .select("id")
    .ilike("name", escapedName)
    .maybeSingle();
  if (existing) return { exerciseId: existing.id };

  const { data: created, error } = await supabase
    .from("exercises")
    .insert({ name: trimmed, created_by: userId })
    .select("id")
    .single();
  if (created) return { exerciseId: created.id };

  // Unique-constraint race: another request created the same (or, since the
  // constraint is case-sensitive but this lookup isn't, a same-but-differently-
  // cased) name first.
  if (error) {
    const { data: retry } = await supabase
      .from("exercises")
      .select("id")
      .ilike("name", escapedName)
      .maybeSingle();
    if (retry) return { exerciseId: retry.id };
  }

  return { error: "Übung konnte nicht angelegt werden." };
}

export type SavedPlanItem = { position: number; exercise_id: string | null };

export async function savePlanItemsAction(
  planId: string,
  items: PlanItemInput[]
): Promise<ActionResult & { items?: SavedPlanItem[] }> {
  const { supabase, userId } = await requirePlanEditAccess(planId);

  // Fetch this up front (not just series_id) so a not-yet-catalogued exercise
  // name can be resolved/auto-created below before the rows are built.
  const { data: plan } = await supabase
    .from("training_plans")
    .select("series_id, category_label")
    .eq("id", planId)
    .single();

  const filteredItems = items.filter((item) => item.exercise_name.trim());

  // Athletes and trainers can both type an exercise name that doesn't exist
  // in the shared library yet (e.g. "Schwungdrücken") — auto-create it so
  // the item still links to an exercise_id and can be progress-tracked, and
  // so a Sportartspezifisch row has something to hang its
  // exercise_instructions (steps/video) off of. Cardio and Leistungsdiagnostik
  // (sprung) rows never resolve to a library exercise — weight/rep-based
  // result tracking and per-exercise instructions don't apply to them.
  //
  // Resolved in parallel rather than one at a time, and a failure here is
  // reported back instead of silently saving the row without an exercise_id
  // (which used to leave results/instructions silently unusable for it).
  // Defense in depth against a client that sends a stale exercise_id (an id
  // left over from before the row's exercise_name was edited — the bug that
  // let a renamed row keep pointing at its old exercise, so newly-entered
  // results and instructions silently attached to the wrong one): re-verify
  // that the id's catalogued name still matches this save's exercise_name
  // before trusting it, and re-resolve otherwise.
  const idsToVerify = Array.from(
    new Set(
      filteredItems
        .filter((item) => item.section !== "cardio" && item.section !== "sprung" && item.exercise_id)
        .map((item) => item.exercise_id as string)
    )
  );
  const { data: existingExercises } = idsToVerify.length
    ? await supabase.from("exercises").select("id, name").in("id", idsToVerify)
    : { data: [] };
  const nameById = new Map((existingExercises ?? []).map((e) => [e.id, e.name.trim().toLowerCase()]));

  const resolvedExerciseIds: (string | null)[] = new Array(filteredItems.length).fill(null);
  const toResolve: { index: number; name: string }[] = [];
  filteredItems.forEach((item, index) => {
    if (item.section === "cardio" || item.section === "sprung") {
      resolvedExerciseIds[index] = item.exercise_id ?? null;
    } else if (item.exercise_id && nameById.get(item.exercise_id) === item.exercise_name.trim().toLowerCase()) {
      resolvedExerciseIds[index] = item.exercise_id;
    } else {
      toResolve.push({ index, name: item.exercise_name });
    }
  });
  if (toResolve.length > 0) {
    const results = await Promise.all(
      toResolve.map(({ name }) => resolveOrCreateExerciseId(supabase, userId, name))
    );
    for (let i = 0; i < toResolve.length; i++) {
      const result = results[i];
      if (result.error || !result.exerciseId) {
        return { error: `Übung „${toResolve[i].name.trim()}" konnte nicht angelegt werden.` };
      }
      resolvedExerciseIds[toResolve[i].index] = result.exerciseId;
    }
  }

  const rows = filteredItems.map((item, index) => ({
    training_plan_id: planId,
    position: index,
    exercise_name: item.exercise_name.trim(),
    exercise_id: resolvedExerciseIds[index],
    section: item.section ?? "kraft",
    reps_or_duration: item.reps_or_duration.trim() || null,
    sets: item.sets.trim() || null,
    rest_time: item.rest_time.trim() || null,
    round_rest: item.round_rest?.trim() || null,
    heart_rate_on: item.heart_rate_on?.trim() || null,
    heart_rate_off: item.heart_rate_off?.trim() || null,
    link_url: normalizeUrl(item.link_url),
    notes: item.notes.trim() || null,
    description: item.description?.trim() || null,
    duration_mode: item.duration_mode ?? null,
  }));

  // Replaces the plan's items in a single database transaction (delete old +
  // insert new) via an RPC, so a failure partway through can't leave the
  // plan's exercise table wiped out with nothing restored — the old
  // delete-then-insert-as-two-calls version could do exactly that.
  const { data: savedRows, error: saveError } = await supabase.rpc(
    "replace_training_plan_items",
    { p_plan_id: planId, p_items: rows }
  );
  if (saveError) return { error: "Speichern fehlgeschlagen." };
  const savedItems: SavedPlanItem[] = (savedRows ?? []).map((r) => ({
    position: r.position,
    exercise_id: r.exercise_id,
  }));

  // For recurring plans, propagate these exercises to sibling occurrences
  // that haven't been individually customized yet (still have zero items).
  // Once a sibling gets its own items, it "detaches" from auto-sync.
  if (plan?.series_id) {
    const { data: siblings } = await supabase
      .from("training_plans")
      .select("id, training_plan_items(id)")
      .eq("series_id", plan.series_id)
      .neq("id", planId);

    const emptySiblingIds = (siblings ?? [])
      .filter((s) => (s.training_plan_items?.length ?? 0) === 0)
      .map((s) => s.id);

    if (emptySiblingIds.length > 0 && rows.length > 0) {
      const siblingRows = emptySiblingIds.flatMap((siblingId) =>
        rows.map((row) => ({ ...row, training_plan_id: siblingId }))
      );
      await supabase.from("training_plan_items").insert(siblingRows);
    }
  }

  revalidatePath(`/trainer/plans/${planId}/edit`);
  revalidatePath("/trainer/plans");
  revalidatePath(`/athlete/plans/${planId}`);
  return { items: savedItems };
}

export async function reschedulePlanAction(
  planId: string,
  newDate: string
): Promise<ActionResult> {
  const { supabase } = await requirePlanEditAccess(planId);

  const { error } = await supabase
    .from("training_plans")
    .update({ date: newDate })
    .eq("id", planId);

  if (error) return { error: "Plan konnte nicht verschoben werden." };

  revalidatePath("/trainer/calendar");
  revalidatePath("/trainer/plans");
  return {};
}

export async function duplicatePlanToDateAction(
  planId: string,
  newDate: string
): Promise<ActionResult> {
  const { supabase, userId } = await requirePlanEditAccess(planId);

  const { data: sourcePlan } = await supabase
    .from("training_plans")
    .select("title, category_label, time, scope_type, group_id, athlete_id")
    .eq("id", planId)
    .single();

  if (!sourcePlan) return { error: "Ursprungsplan nicht gefunden." };

  const { data: sourceItems } = await supabase
    .from("training_plan_items")
    .select(
      "position, exercise_name, exercise_id, section, reps_or_duration, sets, rest_time, round_rest, heart_rate_on, heart_rate_off, link_url, notes, description, duration_mode"
    )
    .eq("training_plan_id", planId)
    .order("position");

  const { data: newPlan, error } = await supabase
    .from("training_plans")
    .insert({
      title: sourcePlan.title,
      category_label: sourcePlan.category_label,
      date: newDate,
      time: sourcePlan.time,
      scope_type: sourcePlan.scope_type,
      group_id: sourcePlan.group_id,
      athlete_id: sourcePlan.athlete_id,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !newPlan) return { error: "Plan konnte nicht kopiert werden." };

  if (sourceItems && sourceItems.length > 0) {
    const { error: itemsError } = await supabase.from("training_plan_items").insert(
      sourceItems.map((item) => ({
        training_plan_id: newPlan.id,
        position: item.position,
        exercise_name: item.exercise_name,
        exercise_id: item.exercise_id,
        section: item.section,
        reps_or_duration: item.reps_or_duration,
        sets: item.sets,
        rest_time: item.rest_time,
        round_rest: item.round_rest,
        heart_rate_on: item.heart_rate_on,
        heart_rate_off: item.heart_rate_off,
        link_url: item.link_url,
        notes: item.notes,
        description: item.description,
        duration_mode: item.duration_mode,
      }))
    );
    if (itemsError) {
      return { error: "Plan wurde angelegt, Übungen konnten aber nicht kopiert werden." };
    }
  }

  revalidatePath("/trainer/calendar");
  revalidatePath("/trainer/plans");
  revalidatePath(`/trainer/plans/${newPlan.id}/edit`);
  return {};
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  const { supabase } = await requirePlanEditAccess(planId);

  const { error } = await supabase.from("training_plans").delete().eq("id", planId);
  if (error) return { error: "Plan konnte nicht gelöscht werden." };

  revalidatePath("/trainer/plans");
  revalidatePath("/athlete");
  return {};
}

export async function copyPlanAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, userId } = await requireTrainerOrAdmin();

  const sourcePlanId = String(formData.get("source_plan_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const scopeType = String(formData.get("scope_type") ?? "") as PlanScope;
  const groupId = String(formData.get("group_id") ?? "") || null;
  const athleteId = String(formData.get("athlete_id") ?? "") || null;

  if (!sourcePlanId || !date) {
    return { error: "Bitte ein Zieldatum angeben." };
  }
  if (scopeType === "group" && !groupId) {
    return { error: "Bitte eine Gruppe auswählen." };
  }
  if (scopeType === "athlete" && !athleteId) {
    return { error: "Bitte einen Athleten auswählen." };
  }

  const { data: sourcePlan } = await supabase
    .from("training_plans")
    .select("title, category_label, time")
    .eq("id", sourcePlanId)
    .single();

  if (!sourcePlan) return { error: "Ursprungsplan nicht gefunden." };

  const { data: sourceItems } = await supabase
    .from("training_plan_items")
    .select(
      "position, exercise_name, exercise_id, section, reps_or_duration, sets, rest_time, round_rest, heart_rate_on, heart_rate_off, link_url, notes, description, duration_mode"
    )
    .eq("training_plan_id", sourcePlanId)
    .order("position");

  const { data: newPlan, error } = await supabase
    .from("training_plans")
    .insert({
      title: sourcePlan.title,
      category_label: sourcePlan.category_label,
      date,
      time: sourcePlan.time,
      scope_type: scopeType,
      group_id: scopeType === "group" ? groupId : null,
      athlete_id: scopeType === "athlete" ? athleteId : null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !newPlan) {
    return { error: "Plan konnte nicht kopiert werden." };
  }

  if (sourceItems && sourceItems.length > 0) {
    const { error: itemsError } = await supabase.from("training_plan_items").insert(
      sourceItems.map((item) => ({
        training_plan_id: newPlan.id,
        position: item.position,
        exercise_name: item.exercise_name,
        exercise_id: item.exercise_id,
        section: item.section,
        reps_or_duration: item.reps_or_duration,
        sets: item.sets,
        rest_time: item.rest_time,
        round_rest: item.round_rest,
        heart_rate_on: item.heart_rate_on,
        heart_rate_off: item.heart_rate_off,
        link_url: item.link_url,
        notes: item.notes,
        description: item.description,
        duration_mode: item.duration_mode,
      }))
    );
    if (itemsError) {
      return { error: "Plan wurde angelegt, Übungen konnten aber nicht kopiert werden." };
    }
  }

  revalidatePath("/trainer/plans");
  redirect(`/trainer/plans/${newPlan.id}/edit`);
}

// Lets an athlete copy any plan they can currently read (their own
// self-created plan, or a plan assigned to them/their group — RLS on the
// select below is what actually enforces this) onto a new date as a fresh
// personal plan. Unlike duplicatePlanToDateAction (trainer/admin-gated via
// requirePlanEditAccess, and preserves the original's group/athlete scope),
// this always lands the copy under the athlete's own scope so it doesn't
// require edit rights on the source and never creates a group-wide plan.
export async function copyPlanForAthleteAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, userId } = await requireAthlete();

  const sourcePlanId = String(formData.get("source_plan_id") ?? "");
  const newDate = String(formData.get("date") ?? "");
  if (!sourcePlanId || !newDate) {
    return { error: "Bitte ein Zieldatum angeben." };
  }

  const { data: sourcePlan } = await supabase
    .from("training_plans")
    .select("title, category_label, time")
    .eq("id", sourcePlanId)
    .maybeSingle();
  if (!sourcePlan) return { error: "Ursprungsplan nicht gefunden oder keine Berechtigung." };

  const { data: sourceItems } = await supabase
    .from("training_plan_items")
    .select(
      "position, exercise_name, exercise_id, section, reps_or_duration, sets, rest_time, round_rest, heart_rate_on, heart_rate_off, link_url, notes, description, duration_mode"
    )
    .eq("training_plan_id", sourcePlanId)
    .order("position");

  const { data: newPlan, error } = await supabase
    .from("training_plans")
    .insert({
      title: sourcePlan.title,
      category_label: sourcePlan.category_label,
      date: newDate,
      time: sourcePlan.time,
      scope_type: "athlete",
      athlete_id: userId,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !newPlan) return { error: "Training konnte nicht kopiert werden." };

  if (sourceItems && sourceItems.length > 0) {
    const { error: itemsError } = await supabase.from("training_plan_items").insert(
      sourceItems.map((item) => ({
        training_plan_id: newPlan.id,
        position: item.position,
        exercise_name: item.exercise_name,
        exercise_id: item.exercise_id,
        section: item.section,
        reps_or_duration: item.reps_or_duration,
        sets: item.sets,
        rest_time: item.rest_time,
        round_rest: item.round_rest,
        heart_rate_on: item.heart_rate_on,
        heart_rate_off: item.heart_rate_off,
        link_url: item.link_url,
        notes: item.notes,
        description: item.description,
        duration_mode: item.duration_mode,
      }))
    );
    if (itemsError) {
      return { error: "Training wurde angelegt, Übungen konnten aber nicht kopiert werden." };
    }
  }

  revalidatePath("/athlete");
  redirect(`/athlete/plans/${newPlan.id}`);
}

// "Auch als Vorlage speichern" in PlanTableEditor's header — snapshots the
// currently-edited plan's rows into a new plan_templates row so it can be
// reused as a starting point for future plans (via the "Vorlage wählen"
// step in NewPlanFlow / OwnPlanFlow). Mirrors the plan_templates_insert RLS
// policy (admin or trainer only — athletes can look at templates but not
// create them) and, like requirePlanEditAccess, also confirms the caller
// may actually edit this specific plan.
//
// group_id is copied from the plan being saved: a group-scoped plan produces
// a template visible to every trainer plus athletes in that group (per the
// plan_templates_select policy); an individual/athlete-scoped plan has no
// group, so the template is saved with group_id = null, which under that
// same policy only the creating trainer can see again in their own "Vorlage
// wählen" picker (trainers see all templates regardless of group_id;
// athletes only see group-scoped ones) — still useful as a personal
// template, just not shared with a group of athletes.
export async function saveAsTemplateAction(
  planId: string,
  items: PlanItemInput[],
  title: string
): Promise<ActionResult> {
  const { supabase, userId, role } = await requirePlanEditAccess(planId);
  if (role !== "admin" && role !== "trainer") {
    return { error: "Keine Berechtigung, eine Vorlage zu speichern." };
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { error: "Bitte einen Titel angeben, bevor die Vorlage gespeichert wird." };
  }

  const filteredItems = items.filter((item) => item.exercise_name.trim());
  if (filteredItems.length === 0) {
    return { error: "Die Übungstabelle ist leer — es gibt nichts zu speichern." };
  }

  const { data: plan } = await supabase
    .from("training_plans")
    .select("category_label, group_id")
    .eq("id", planId)
    .single();
  if (!plan) return { error: "Plan nicht gefunden." };

  const templateItems = filteredItems.map((item) => ({
    exercise_name: item.exercise_name.trim(),
    reps_or_duration: item.reps_or_duration.trim(),
    sets: item.sets.trim(),
    rest_time: item.rest_time.trim(),
    notes: item.notes.trim(),
    link_url: item.link_url.trim(),
    section: item.section ?? "kraft",
    round_rest: item.round_rest?.trim() ?? "",
    heart_rate_on: item.heart_rate_on?.trim() ?? "",
    heart_rate_off: item.heart_rate_off?.trim() ?? "",
    description: item.description?.trim() ?? "",
    duration_mode: item.duration_mode ?? null,
  }));

  const { error } = await supabase.from("plan_templates").insert({
    category_label: plan.category_label,
    title: trimmedTitle,
    items: templateItems,
    created_by: userId,
    group_id: plan.group_id ?? null,
  });

  if (error) return { error: "Vorlage konnte nicht gespeichert werden." };

  revalidatePath("/trainer/plans/new");
  revalidatePath("/athlete/plans/new");
  return {};
}

// plan_templates_delete (admin, or the trainer who created it) enforces who
// may actually delete a row — this just surfaces a friendly error when that
// check fails instead of silently reporting success on a 0-row delete.
export async function deleteTemplateAction(templateId: string): Promise<ActionResult> {
  const { supabase } = await requireTrainerOrAdmin();

  const { data, error } = await supabase
    .from("plan_templates")
    .delete()
    .eq("id", templateId)
    .select("id");

  if (error) return { error: "Vorlage konnte nicht gelöscht werden." };
  if (!data || data.length === 0) {
    return { error: "Keine Berechtigung, diese Vorlage zu löschen." };
  }

  revalidatePath("/trainer/plans/new");
  revalidatePath("/athlete/plans/new");
  return {};
}

// Resolves an exercise name to a library exercise_id on the spot, so the
// "Anweisung und Link" panel (Sportartspezifisch/Karate rows) and the
// "Ergebnis" set-entry dialog (Athletik Kraft rows) can be used for a
// brand-new exercise immediately, without first saving the whole plan via
// savePlanItemsAction (which is where this resolution previously only
// happened). Mirrors that same ilike-then-insert lookup, and the
// exercises_insert RLS policy allows any authenticated role (admin,
// trainer, athlete) — matching who can already reach this UI.
export async function ensureExerciseAction(
  name: string
): Promise<{ exerciseId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  return resolveOrCreateExerciseId(supabase, user.id, name);
}
