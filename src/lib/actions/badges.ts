"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";

// Hides a badge from the athlete's own view without touching the badge-check
// logic in src/lib/badges.ts: tryAwardOnce only inserts on the
// (athlete_id, badge_key) unique key, so a dismissed-but-still-present row
// keeps future re-checks (e.g. finishing another session re-evaluates every
// milestone tier already passed) from silently recreating it.
export async function dismissBadgeAction(badgeKey: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("athlete_badges")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("athlete_id", user.id)
    .eq("badge_key", badgeKey);

  if (error) return { error: "Erfolg konnte nicht ausgeblendet werden." };

  revalidatePath("/athlete");
  return {};
}
