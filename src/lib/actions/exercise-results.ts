"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";
import { checkExercisePr, type BadgeAward } from "@/lib/badges";

export async function upsertExerciseResultAction(
  exerciseId: string,
  date: string,
  setNumber: number,
  weight: number,
  reps: number | null,
  unit: string,
  planId: string,
  setType: "aufwaermsatz" | "arbeitssatz" = "arbeitssatz",
  rir: number | null = null
): Promise<ActionResult & { newBadges?: BadgeAward[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("exercise_results").upsert(
    {
      athlete_id: user.id,
      exercise_id: exerciseId,
      date,
      set_number: setNumber,
      value: weight,
      reps,
      unit: unit.trim() || null,
      training_plan_id: planId,
      set_type: setType,
      rir,
    },
    { onConflict: "athlete_id,exercise_id,date,set_number" }
  );

  if (error) return { error: "Ergebnis konnte nicht gespeichert werden." };

  revalidatePath("/trainer/athletes");
  revalidatePath("/athlete/athletik");
  revalidatePath("/athlete");

  if (setType === "arbeitssatz") {
    const { data: exercise } = await supabase.from("exercises").select("name").eq("id", exerciseId).maybeSingle();
    if (exercise?.name) {
      const award = await checkExercisePr(supabase, user.id, exerciseId, exercise.name);
      if (award) return { newBadges: [award] };
    }
  }
  return {};
}

export async function deleteExerciseResultSetAction(
  exerciseId: string,
  date: string,
  setNumber: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("exercise_results")
    .delete()
    .eq("athlete_id", user.id)
    .eq("exercise_id", exerciseId)
    .eq("date", date)
    .eq("set_number", setNumber);

  if (error) return { error: "Satz konnte nicht gelöscht werden." };

  revalidatePath("/trainer/athletes");
  revalidatePath("/athlete/athletik");
  return {};
}
