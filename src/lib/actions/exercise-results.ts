"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";

export async function upsertExerciseResultAction(
  exerciseId: string,
  date: string,
  setNumber: number,
  weight: number,
  reps: number | null,
  unit: string,
  planId: string
): Promise<ActionResult> {
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
    },
    { onConflict: "athlete_id,exercise_id,date,set_number" }
  );

  if (error) return { error: "Ergebnis konnte nicht gespeichert werden." };

  revalidatePath("/trainer/athletik");
  revalidatePath("/athlete/athletik");
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

  revalidatePath("/trainer/athletik");
  revalidatePath("/athlete/athletik");
  return {};
}
