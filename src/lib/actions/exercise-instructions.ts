"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";

// Instructions are shared club-wide: only real web links (https, or a bare
// domain that gets https:// added), never javascript:/data: or the like.
function safeVideoUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// The trainer-authored "Anweisung vom Trainer" shown to athletes as a
// step-by-step instructions modal, with an optional video link. Stored once
// per library exercise (exercise_instructions.exercise_id is unique) so every
// plan that references the same exercise shares the same instructions.
export async function upsertExerciseInstructionsAction(
  exerciseId: string,
  data: {
    short_summary?: string;
    watch_note?: string;
    steps: string[];
    video_url?: string;
    video_label?: string;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "trainer") {
    return { error: "Keine Berechtigung." };
  }

  const steps = data.steps.map((s) => s.trim()).filter(Boolean);

  const { error } = await supabase.from("exercise_instructions").upsert(
    {
      exercise_id: exerciseId,
      short_summary: data.short_summary?.trim() || null,
      watch_note: data.watch_note?.trim() || null,
      steps,
      video_url: safeVideoUrl(data.video_url),
      video_label: data.video_label?.trim() || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "exercise_id" }
  );

  if (error) return { error: "Anweisung konnte nicht gespeichert werden." };

  revalidatePath("/trainer/plans");
  revalidatePath("/athlete");
  return {};
}
