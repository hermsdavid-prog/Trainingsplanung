"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";
import { todayISO, isMesocycleCurrent } from "@/lib/date";

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

  // An athlete adding their own goal: only for the Mesozyklus running today.
  // Trainers can still prepare goals for upcoming cycles. The same rule is
  // enforced by mesocycle_goals_insert RLS; this gives a readable message.
  if (input.athleteId === user.id) {
    const { data: meso } = await supabase
      .from("training_mesocycles")
      .select("start_date, weeks")
      .eq("id", input.mesocycleId)
      .maybeSingle();
    if (!meso || !isMesocycleCurrent(meso.start_date, meso.weeks, todayISO())) {
      return { error: "Eigene Ziele kannst du nur für den laufenden Mesozyklus eintragen." };
    }
  }

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

  const { data, error } = await supabase.from("mesocycle_goals").update({ text: trimmed }).eq("id", goalId).select("id");
  if (error) return { error: "Ziel konnte nicht gespeichert werden." };
  if (!data || data.length === 0) return { error: "Keine Berechtigung, dieses Ziel zu ändern." };

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

  const { data, error } = await supabase.from("mesocycle_goals").delete().eq("id", goalId).select("id");
  if (error) return { error: "Ziel konnte nicht gelöscht werden." };
  if (!data || data.length === 0) return { error: "Keine Berechtigung, dieses Ziel zu löschen." };

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

  const { data, error } = await supabase
    .from("mesocycle_goals")
    .update({ achieved_at: achieved ? new Date().toISOString() : null })
    .eq("id", goalId)
    .select("id");
  if (error) return { error: "Ziel konnte nicht aktualisiert werden." };
  if (!data || data.length === 0) return { error: "Keine Berechtigung, dieses Ziel zu ändern." };

  revalidatePath("/athlete/mesocycles");
  revalidatePath("/athlete");
  revalidatePath("/trainer/athletes");
  return {};
}

// "Neuer Mesozyklus — deine 3 Ziele": the athlete's kickoff goals for a
// block that just started, saved in one go (1–3 non-empty entries).
export async function saveKickoffGoalsAction(mesocycleId: string, texts: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const goals = texts.map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (goals.length === 0) return { error: "Bitte mindestens ein Ziel eintragen." };

  const { data: meso } = await supabase
    .from("training_mesocycles")
    .select("start_date, weeks")
    .eq("id", mesocycleId)
    .maybeSingle();
  if (!meso || !isMesocycleCurrent(meso.start_date, meso.weeks, todayISO())) {
    return { error: "Eigene Ziele kannst du nur für den laufenden Mesozyklus eintragen." };
  }

  const { count } = await supabase
    .from("mesocycle_goals")
    .select("id", { count: "exact", head: true })
    .eq("mesocycle_id", mesocycleId)
    .eq("athlete_id", user.id);

  const { error } = await supabase.from("mesocycle_goals").insert(
    goals.map((text, i) => ({
      mesocycle_id: mesocycleId,
      athlete_id: user.id,
      text,
      position: (count ?? 0) + i,
      created_by: user.id,
    }))
  );
  if (error) return { error: "Ziele konnten nicht gespeichert werden." };

  revalidatePath("/athlete");
  revalidatePath("/athlete/mesocycles");
  revalidatePath("/trainer/athletes");
  return {};
}

// "Überspringen" on the kickoff prompt — not asked again for this block.
export async function skipKickoffGoalsAction(mesocycleId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("mesocycle_goal_prompt_skips")
    .upsert({ athlete_id: user.id, mesocycle_id: mesocycleId }, { onConflict: "athlete_id,mesocycle_id" });
  if (error) return { error: "Konnte nicht gespeichert werden." };

  revalidatePath("/athlete");
  return {};
}
