"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";
import { checkSessionBadges, type BadgeAward } from "@/lib/badges";

// Belastungsempfinden (RPE) for a whole training session, saved once when the
// athlete taps "Training beenden" at the end of a live workout session.
export async function saveSessionRpeAction(
  planId: string,
  rpe: number
): Promise<ActionResult & { newBadges?: BadgeAward[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) {
    return { error: "Bitte ein Belastungsempfinden zwischen 1 und 10 wählen." };
  }

  const { error } = await supabase.from("session_ratings").upsert(
    {
      training_plan_id: planId,
      athlete_id: user.id,
      rpe,
    },
    { onConflict: "training_plan_id,athlete_id" }
  );

  if (error) return { error: "Belastungsempfinden konnte nicht gespeichert werden." };

  revalidatePath(`/athlete/plans/${planId}`);
  revalidatePath(`/athlete/plans/${planId}/session`);
  revalidatePath("/athlete");
  revalidatePath("/trainer/athletes");

  const newBadges = await checkSessionBadges(supabase, user.id);
  return newBadges.length > 0 ? { newBadges } : {};
}
