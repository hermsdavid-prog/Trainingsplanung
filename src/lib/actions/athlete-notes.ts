"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";

// A short heads-up a trainer can send an athlete — e.g. "your readiness
// dropped, take it easy today" — surfaced on the athlete's dashboard.
// athlete_notes_insert RLS already restricts this to an athlete in one of
// the trainer's groups; the actual write just relies on that.
export async function sendAthleteNoteAction(
  athleteId: string,
  message: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const trimmed = message.trim();
  if (!trimmed) return { error: "Bitte eine Nachricht eingeben." };

  const { error } = await supabase.from("athlete_notes").insert({
    athlete_id: athleteId,
    trainer_id: user.id,
    message: trimmed,
  });

  if (error) return { error: "Hinweis konnte nicht gesendet werden." };

  revalidatePath("/trainer/athletes");
  revalidatePath("/athlete");
  return {};
}

export async function markAthleteNoteReadAction(noteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("athlete_notes")
    .update({ read_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("athlete_id", user.id);

  if (error) return { error: "Konnte nicht als gelesen markiert werden." };

  revalidatePath("/athlete");
  return {};
}

export async function deleteAthleteNoteAction(noteId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("athlete_notes").delete().eq("id", noteId).eq("trainer_id", user.id);

  if (error) return { error: "Hinweis konnte nicht gelöscht werden." };

  revalidatePath("/trainer/athletes");
  return {};
}
