"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string };

export async function upsertFeedbackAction(
  itemId: string,
  data: { done?: boolean; actual_value?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("athlete_feedback").upsert(
    {
      training_plan_item_id: itemId,
      athlete_id: user.id,
      ...data,
    },
    { onConflict: "training_plan_item_id,athlete_id" }
  );

  if (error) return { error: "Speichern fehlgeschlagen." };
  return {};
}
