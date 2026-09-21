"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";

// Per-athlete Trainingsziele for a Mesozyklus — even for a group-scoped
// Mesozyklus, each athlete in that group gets their own distinct goals
// (mesocycle_goals_insert RLS checks the athlete actually belongs to the
// mesocycle's scope via private.mesocycle_athlete_allowed). No extra
// pre-check here beyond auth: the picker UI only ever offers mesocycles the
// trainer already has access to, same trust level as athlete-notes.ts.
export async function createMesocycleGoalAction(input: {
  mesocycleId: string;
  athleteId: string;
  text: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const text = input.text.trim();
  if (!text) return { error: "Bitte ein Ziel eingeben." };

  const { count } = await supabase
    .from("mesocycle_goals")
    .select("id", { count: "exact", head: true })
    .eq("mesocycle_id", input.mesocycleId)
    .eq("athlete_id", input.athleteId);

  const { error } = await supabase.from("mesocycle_goals").insert({
    mesocycle_id: input.mesocycleId,
    athlete_id: input.athleteId,
    text,
    position: count ?? 0,
    created_by: user.id,
  });

  if (error) return { error: "Ziel konnte nicht angelegt werden." };

  revalidatePath("/trainer/athletes");
  revalidatePath("/athlete/mesocycles");
  return {};
}

export async function updateMesocycleGoalTextAction(goalId: string, text: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const trimmed = text.trim();
  if (!trimmed) return { error: "Bitte ein Ziel eingeben." };

  const { error } = await supabase.from("mesocycle_goals").update({ text: trimmed }).eq("id", goalId);
  if (error) return { error: "Ziel konnte nicht gespeichert werden." };

  revalidatePath("/trainer/athletes");
  revalidatePath("/athlete/mesocycles");
  return {};
}

export async function deleteMesocycleGoalAction(goalId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("mesocycle_goals").delete().eq("id", goalId);
  if (error) return { error: "Ziel konnte nicht gelöscht werden." };

  revalidatePath("/trainer/athletes");
  revalidatePath("/athlete/mesocycles");
  return {};
}

// Callable by the athlete (their own goal) or the trainer (correcting on
// the athlete's behalf) — mesocycle_goals_update RLS allows both.
export async function toggleMesocycleGoalAction(goalId: string, achieved: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("mesocycle_goals")
    .update({ achieved_at: achieved ? new Date().toISOString() : null })
    .eq("id", goalId);
  if (error) return { error: "Ziel konnte nicht aktualisiert werden." };

  revalidatePath("/athlete/mesocycles");
  revalidatePath("/trainer/athletes");
  return {};
}
