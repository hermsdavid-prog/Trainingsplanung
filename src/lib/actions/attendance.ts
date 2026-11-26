"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";

export type ActionResult = { error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

function revalidate() {
  revalidatePath("/trainer/attendance");
  revalidatePath("/athlete");
  revalidatePath("/athlete/calendar");
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// Trainer: mark an athlete absent (absent = true) or present again.
export async function setAbsenceAction(sessionId: string, athleteId: string, absent: boolean): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { error } = absent
    ? await supabase
        .from("attendance_absences")
        .upsert({ session_id: sessionId, athlete_id: athleteId, self_reported: false, created_by: userId }, { onConflict: "session_id,athlete_id", ignoreDuplicates: true })
    : await supabase.from("attendance_absences").delete().eq("session_id", sessionId).eq("athlete_id", athleteId);
  if (error) return { error: "Anwesenheit konnte nicht gespeichert werden." };
  revalidate();
  return {};
}

// Trainer: remove a session (kept as a cancelled row so the weekly schedule
// doesn't recreate it) or bring it back.
export async function setSessionCancelledAction(sessionId: string, cancelled: boolean): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("attendance_sessions")
    .update({ cancelled_at: cancelled ? new Date().toISOString() : null })
    .eq("id", sessionId)
    .select("id");
  if (error || !data?.length) return { error: "Termin konnte nicht geändert werden." };
  revalidate();
  return {};
}

// Trainer: an additional session. A removed session at the same date and
// start time is restored instead.
export async function createExtraSessionAction(input: {
  rosterId: string;
  date: string;
  start: string;
  end: string;
  note: string;
}): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Bitte ein Datum wählen." };
  if (!TIME.test(input.start) || !TIME.test(input.end)) return { error: "Bitte Uhrzeiten im Format 18:00 angeben." };
  if (input.end <= input.start) return { error: "Das Ende muss nach dem Beginn liegen." };
  const note = input.note.trim().slice(0, 200) || null;

  const { data: existing } = await supabase
    .from("attendance_sessions")
    .select("id, cancelled_at")
    .eq("roster_id", input.rosterId)
    .eq("date", input.date)
    .eq("start_time", input.start)
    .maybeSingle();
  if (existing && !existing.cancelled_at) return { error: "Zu dieser Zeit gibt es an dem Tag schon ein Training." };

  const { error } = existing
    ? await supabase
        .from("attendance_sessions")
        .update({ cancelled_at: null, end_time: input.end, note })
        .eq("id", existing.id)
    : await supabase.from("attendance_sessions").insert({
        roster_id: input.rosterId,
        date: input.date,
        start_time: input.start,
        end_time: input.end,
        kind: "extra",
        note,
        created_by: userId,
      });
  if (error) return { error: "Training konnte nicht angelegt werden." };
  revalidate();
  return {};
}

// Athlete: sign off from a session today or later (optionally with a reason),
// or take it back. Signing off again only updates the reason.
export async function setOwnAbsenceAction(sessionId: string, absent: boolean, reason?: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const { data: session } = await supabase
    .from("attendance_sessions")
    .select("date, cancelled_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.cancelled_at) return { error: "Dieses Training findet nicht statt." };
  if (session.date < todayISO()) return { error: "Vergangene Trainings kann nur der Trainer ändern." };

  if (!absent) {
    const { error } = await supabase
      .from("attendance_absences")
      .delete()
      .eq("session_id", sessionId)
      .eq("athlete_id", userId)
      .eq("self_reported", true);
    if (error) return { error: "Abmeldung konnte nicht zurückgenommen werden." };
    revalidate();
    return {};
  }

  const cleanReason = reason?.trim().slice(0, 200) || null;
  const { error } = await supabase
    .from("attendance_absences")
    .insert({ session_id: sessionId, athlete_id: userId, self_reported: true, created_by: userId, reason: cleanReason });
  if (error?.code === "23505") {
    const { error: updateError } = await supabase
      .from("attendance_absences")
      .update({ reason: cleanReason })
      .eq("session_id", sessionId)
      .eq("athlete_id", userId)
      .eq("self_reported", true);
    if (updateError) return { error: "Grund konnte nicht gespeichert werden." };
  } else if (error) {
    return { error: "Abmeldung konnte nicht gespeichert werden." };
  }
  revalidate();
  return {};
}
