"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";
import { checkExercisePr, type BadgeAward } from "@/lib/badges";
import type { Side } from "@/lib/per-side";
import { plausibleVelocity } from "@/lib/vbt";

export async function upsertExerciseResultAction(
  exerciseId: string,
  date: string,
  setNumber: number,
  weight: number,
  reps: number | null,
  unit: string,
  planId: string,
  setType: "aufwaermsatz" | "arbeitssatz" = "arbeitssatz",
  rir: number | null = null,
  // Left or right row of a unilateral ("je Seite") exercise; null otherwise.
  side: Side | null = null,
  // Jump tests (Leistungsdiagnostik): ground contact time and RSI.
  contactMs: number | null = null,
  rsi: number | null = null,
  // VBT: mean velocity of the fastest and of the last rep (m/s).
  velocity: number | null = null,
  velocityLast: number | null = null
): Promise<ActionResult & { newBadges?: BadgeAward[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  // VBT: a typo ("62" for 0,62 m/s) would skew the whole profile; the last
  // rep only counts next to a plausible fastest rep and can't be faster.
  if (velocity != null && !plausibleVelocity(velocity)) {
    return { error: "Die Geschwindigkeit ist unplausibel (in m/s eintragen, z. B. 0,62)." };
  }
  if (velocity == null || velocityLast == null || !plausibleVelocity(velocityLast) || velocityLast > velocity) {
    velocityLast = null;
  }

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
      side,
      contact_ms: contactMs,
      rsi,
      velocity,
      velocity_last: velocityLast,
    },
    { onConflict: "training_plan_id,athlete_id,exercise_id,date,set_number" }
  );

  if (error) return { error: "Ergebnis konnte nicht gespeichert werden." };

  revalidatePath("/trainer/athletes");
  revalidatePath("/trainer/training");
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
  setNumber: number,
  planId: string
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
    .eq("set_number", setNumber)
    .eq("training_plan_id", planId);

  if (error) return { error: "Satz konnte nicht gelöscht werden." };

  revalidatePath("/trainer/athletes");
  revalidatePath("/trainer/training");
  revalidatePath("/athlete/athletik");
  return {};
}
