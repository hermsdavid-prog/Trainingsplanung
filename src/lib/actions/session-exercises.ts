"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureExerciseAction, type ActionResult } from "@/lib/actions/plans";

export type AddedSessionItem = {
  itemId: string;
  exerciseId: string | null;
  name: string;
};

// Lets an athlete add a Kraft exercise to a training that's already under
// way — training_plan_items_insert RLS only allows this when the plan's
// created_by is the athlete themselves (i.e. their own self-built training,
// see createOwnPlanAction), so a trainer-assigned plan's item list stays
// fixed as prescribed.
export async function addSessionExerciseAction(
  planId: string,
  exerciseName: string
): Promise<ActionResult & { item?: AddedSessionItem }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const trimmed = exerciseName.trim();
  if (!trimmed) return { error: "Bitte eine Übung auswählen." };

  const { exerciseId, error: exerciseError } = await ensureExerciseAction(trimmed);
  if (exerciseError || !exerciseId) return { error: exerciseError ?? "Übung konnte nicht angelegt werden." };

  const { data: existingItems } = await supabase
    .from("training_plan_items")
    .select("position")
    .eq("training_plan_id", planId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existingItems?.[0]?.position ?? -1) + 1;

  const { data: item, error } = await supabase
    .from("training_plan_items")
    .insert({
      training_plan_id: planId,
      exercise_id: exerciseId,
      exercise_name: trimmed,
      section: "kraft",
      sets: "3",
      position: nextPosition,
    })
    .select("id, exercise_id, exercise_name")
    .single();

  if (error || !item) return { error: "Übung konnte nicht hinzugefügt werden." };

  revalidatePath(`/athlete/plans/${planId}/session`);
  return { item: { itemId: item.id, exerciseId: item.exercise_id, name: item.exercise_name } };
}
