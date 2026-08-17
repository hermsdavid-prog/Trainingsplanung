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
// plan's creator, or the trainer of its group may edit; an athlete's own
// self-created plan is only editable by that athlete (created_by = auth.uid()),
// not by trainers viewing it.
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
    .select("id, created_by, group_id")
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
  const date = String(formData.get("date") ?? "");
  const scopeType = String(formData.get("scope_type") ?? "") as PlanScope;
  const groupId = String(formData.get("group_id") ?? "") || null;
  const athleteId = String(formData.get("athlete_id") ?? "") || null;
  const repeatUntil = String(formData.get("repeat_until") ?? "") || null;

  if (!date) {
    return { error: "Bitte ein Datum angeben." };
  }
  if (scopeType === "group" && !groupId) {
    return { error: "Bitte eine Gruppe auswählen." };
  }
  if (scopeType === "athlete" && !athleteId) {
    return { error: "Bitte einen Athleten auswählen." };
  }

  const dates = repeatUntil ? weeklyOccurrences(date, repeatUntil) : [date];
  const seriesId = dates.length > 1 ? randomUUID() : null;

  const { data: plans, error } = await supabase
    .from("training_plans")
    .insert(
      dates.map((occurrenceDate) => ({
        title: categoryLabel,
        category_label: categoryLabel,
        date: occurrenceDate,
        scope_type: scopeType,
        group_id: scopeType === "group" ? groupId : null,
        athlete_id: scopeType === "athlete" ? athleteId : null,
        series_id: seriesId,
        created_by: userId,
      }))
    )
    .select("id, date")
    .order("date");

  if (error || !plans || plans.length === 0) {
    return { error: "Plan konnte nicht angelegt werden." };
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
  const date = String(formData.get("date") ?? "");

  if (!date) {
    return { error: "Bitte ein Datum angeben." };
  }

  const { data: plan, error } = await supabase
    .from("training_plans")
    .insert({
      title: categoryLabel,
      category_label: categoryLabel,
      date,
      scope_type: "athlete",
      athlete_id: userId,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !plan) {
    return { error: "Plan konnte nicht angelegt werden." };
  }

  revalidatePath("/athlete");
  redirect(`/athlete/plans/${plan.id}`);
}

export async function updatePlanMetaAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const planId = String(formData.get("plan_id") ?? "");
  if (!planId) return { error: "Bitte ein Datum angeben." };

  const { supabase } = await requirePlanEditAccess(planId);

  const categoryLabelRaw = String(formData.get("category_label") ?? "").trim();
  const categoryLabel = isValidPlanType(categoryLabelRaw) ? categoryLabelRaw : PLAN_TYPES[0];
  const date = String(formData.get("date") ?? "");

  if (!date) {
    return { error: "Bitte ein Datum angeben." };
  }

  const { error } = await supabase
    .from("training_plans")
    .update({ title: categoryLabel, category_label: categoryLabel, date })
    .eq("id", planId);

  if (error) return { error: "Änderungen konnten nicht gespeichert werden." };

  revalidatePath(`/trainer/plans/${planId}/edit`);
  revalidatePath("/trainer/plans");
  revalidatePath(`/athlete/plans/${planId}`);
  revalidatePath("/athlete");
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
  section?: "kraft" | "cardio";
  round_rest?: string;
  heart_rate_on?: string;
  heart_rate_off?: string;
};

// Prefix bare domains/paths with https:// so links always navigate instead
// of being interpreted as a relative path on this site.
function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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

  const isAthletik = plan?.category_label?.trim().toLowerCase() === "athletik";
  const filteredItems = items.filter((item) => item.exercise_name.trim());

  // Athletes and trainers can both type an exercise name that doesn't exist
  // in the shared library yet (e.g. "Schwungdrücken") — auto-create it so
  // the item still links to an exercise_id and can be progress-tracked.
  // Cardio rows never resolve to a library exercise — the weight/rep-based
  // result tracking doesn't apply to them.
  const resolvedExerciseIds: (string | null)[] = [];
  for (const item of filteredItems) {
    if (!isAthletik || item.section === "cardio") {
      resolvedExerciseIds.push(item.exercise_id ?? null);
      continue;
    }
    if (item.exercise_id) {
      resolvedExerciseIds.push(item.exercise_id);
      continue;
    }
    const name = item.exercise_name.trim();
    const { data: existing } = await supabase
      .from("exercises")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (existing) {
      resolvedExerciseIds.push(existing.id);
      continue;
    }
    const { data: created } = await supabase
      .from("exercises")
      .insert({ name, created_by: userId })
      .select("id")
      .single();
    resolvedExerciseIds.push(created?.id ?? null);
  }

  const { error: deleteError } = await supabase
    .from("training_plan_items")
    .delete()
    .eq("training_plan_id", planId);
  if (deleteError) return { error: "Speichern fehlgeschlagen." };

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
  }));

  let savedItems: SavedPlanItem[] = [];
  if (rows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("training_plan_items")
      .insert(rows)
      .select("position, exercise_id");
    if (insertError) return { error: "Speichern fehlgeschlagen." };
    savedItems = inserted ?? [];
  }

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
  const { supabase } = await requireTrainerOrAdmin();

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
  const { supabase, userId } = await requireTrainerOrAdmin();

  const { data: sourcePlan } = await supabase
    .from("training_plans")
    .select("title, category_label, scope_type, group_id, athlete_id")
    .eq("id", planId)
    .single();

  if (!sourcePlan) return { error: "Ursprungsplan nicht gefunden." };

  const { data: sourceItems } = await supabase
    .from("training_plan_items")
    .select(
      "position, exercise_name, exercise_id, section, reps_or_duration, sets, rest_time, round_rest, heart_rate_on, heart_rate_off, link_url, notes"
    )
    .eq("training_plan_id", planId)
    .order("position");

  const { data: newPlan, error } = await supabase
    .from("training_plans")
    .insert({
      title: sourcePlan.title,
      category_label: sourcePlan.category_label,
      date: newDate,
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
    .select("title, category_label")
    .eq("id", sourcePlanId)
    .single();

  if (!sourcePlan) return { error: "Ursprungsplan nicht gefunden." };

  const { data: sourceItems } = await supabase
    .from("training_plan_items")
    .select(
      "position, exercise_name, exercise_id, section, reps_or_duration, sets, rest_time, round_rest, heart_rate_on, heart_rate_off, link_url, notes"
    )
    .eq("training_plan_id", sourcePlanId)
    .order("position");

  const { data: newPlan, error } = await supabase
    .from("training_plans")
    .insert({
      title: sourcePlan.title,
      category_label: sourcePlan.category_label,
      date,
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
      }))
    );
    if (itemsError) {
      return { error: "Plan wurde angelegt, Übungen konnten aber nicht kopiert werden." };
    }
  }

  revalidatePath("/trainer/plans");
  redirect(`/trainer/plans/${newPlan.id}/edit`);
}
