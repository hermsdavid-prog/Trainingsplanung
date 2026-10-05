"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { weeklyOccurrences, dailyOccurrences, appWallTimeToUTCISOString, moveStartToAppDate } from "@/lib/date";

export type ActionResult = { error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

async function currentRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role ?? null;
}

export type CreateEventInput = {
  title: string;
  description: string;
  eventType: string;
  color: string;
  date: string;
  // A contiguous multi-day span ("von/bis") — every day from date through
  // endDate (inclusive) gets its own event row. Independent of repeatUntil
  // below, which is the older weekly-recurrence path (same weekday each
  // week); a caller sets at most one of the two.
  endDate: string | null;
  time: string;
  allDay: boolean;
  // Empty array = "Alle" (not scoped to any specific group, the previous
  // groupId: null behavior). One or more ids = one event per selected group.
  groupIds: string[];
  athleteId: string | null;
  repeatUntil: string | null;
};

export async function createEventAction(input: CreateEventInput): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  // Athletes propose dates (proposeEventAction); confirmed ones are for
  // trainers and admins only.
  const role = await currentRole(supabase, userId);
  if (role !== "trainer" && role !== "admin") return { error: "Keine Berechtigung." };

  if (!input.title.trim() || !input.date) {
    return { error: "Bitte Titel und Datum angeben." };
  }
  if (input.endDate && input.endDate < input.date) {
    return { error: "Das Enddatum muss nach dem Startdatum liegen." };
  }
  if (input.repeatUntil && input.repeatUntil < input.date) {
    return { error: "Das Wiederholungsdatum muss nach dem Startdatum liegen." };
  }

  const dates = input.endDate
    ? dailyOccurrences(input.date, input.endDate)
    : input.repeatUntil
      ? weeklyOccurrences(input.date, input.repeatUntil)
      : [input.date];
  const targetGroupIds: (string | null)[] = input.groupIds.length > 0 ? input.groupIds : [null];
  const seriesId = dates.length * targetGroupIds.length > 1 ? randomUUID() : null;

  const rows = targetGroupIds.flatMap((groupId) =>
    dates.map((date) => ({
      title: input.title.trim(),
      description: input.description.trim() || null,
      event_type: input.eventType.trim() || "Termin",
      color: input.color,
      start_at: input.allDay ? `${date}T00:00:00Z` : appWallTimeToUTCISOString(date, input.time || "00:00"),
      all_day: input.allDay,
      group_id: groupId,
      athlete_id: input.athleteId,
      series_id: seriesId,
      status: "confirmed" as const,
      created_by: userId,
    }))
  );

  const { error } = await supabase.from("events").insert(rows);
  if (error) return { error: "Termin konnte nicht angelegt werden." };

  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}

// Longest span an athlete can propose in one go ("von/bis").
const MAX_PROPOSAL_DAYS = 31;

export async function proposeEventAction(input: {
  title: string;
  description: string;
  date: string;
  // Optional last day (inclusive) of a multi-day proposal, e.g. a camp.
  endDate?: string | null;
  groupId: string;
}): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();

  if (!input.title.trim() || !input.date || !input.groupId) {
    return { error: "Bitte Titel, Datum und Gruppe angeben." };
  }
  const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!isDate(input.date) || (input.endDate && !isDate(input.endDate))) {
    return { error: "Ungültiges Datum." };
  }
  const endDate = input.endDate && input.endDate !== input.date ? input.endDate : null;
  if (endDate && endDate < input.date) {
    return { error: "Das Enddatum muss nach dem Startdatum liegen." };
  }

  // Like a trainer's multi-day event: one all-day row per day, sharing a
  // series so the trainer confirms or declines the whole span at once.
  const dates = endDate ? dailyOccurrences(input.date, endDate) : [input.date];
  if (dates.length === 0) return { error: "Ungültiges Datum." };
  if (dates.length > MAX_PROPOSAL_DAYS) {
    return { error: `Ein Vorschlag kann höchstens ${MAX_PROPOSAL_DAYS} Tage umfassen.` };
  }
  const seriesId = dates.length > 1 ? randomUUID() : null;

  const { error } = await supabase.from("events").insert(
    dates.map((date) => ({
      title: input.title.trim(),
      description: input.description.trim() || null,
      event_type: "Vorschlag",
      color: "#94a3b8",
      start_at: `${date}T00:00:00Z`,
      all_day: true,
      group_id: input.groupId,
      athlete_id: userId,
      series_id: seriesId,
      status: "proposed" as const,
      created_by: userId,
    }))
  );

  if (error) return { error: "Vorschlag konnte nicht gespeichert werden." };

  revalidatePath("/athlete/calendar");
  revalidatePath("/trainer/calendar");
  return {};
}

export async function duplicateEventToDateAction(
  eventId: string,
  newDate: string
): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("events")
    .select("title, description, event_type, color, start_at, end_at, all_day, group_id, athlete_id, status")
    .eq("id", eventId)
    .single();

  if (!existing) return { error: "Termin nicht gefunden." };

  const oldStart = new Date(existing.start_at);
  const newStart = moveStartToAppDate(existing.start_at, existing.all_day, newDate);

  let newEnd: string | null = null;
  if (existing.end_at) {
    const durationMs = new Date(existing.end_at).getTime() - oldStart.getTime();
    newEnd = new Date(new Date(newStart).getTime() + durationMs).toISOString();
  }

  const { error } = await supabase.from("events").insert({
    title: existing.title,
    description: existing.description,
    event_type: existing.event_type,
    color: existing.color,
    start_at: newStart,
    end_at: newEnd,
    all_day: existing.all_day,
    group_id: existing.group_id,
    athlete_id: existing.athlete_id,
    status: existing.status,
    created_by: userId,
  });

  if (error) return { error: "Termin konnte nicht kopiert werden." };

  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}

export async function rescheduleEventAction(
  eventId: string,
  newDate: string
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data: existing } = await supabase
    .from("events")
    .select("start_at, end_at, all_day")
    .eq("id", eventId)
    .single();

  if (!existing) return { error: "Termin nicht gefunden." };

  const oldStart = new Date(existing.start_at);
  const newStart = moveStartToAppDate(existing.start_at, existing.all_day, newDate);

  let newEnd: string | null = null;
  if (existing.end_at) {
    const durationMs = new Date(existing.end_at).getTime() - oldStart.getTime();
    newEnd = new Date(new Date(newStart).getTime() + durationMs).toISOString();
  }

  const { data, error } = await supabase
    .from("events")
    .update({ start_at: newStart, end_at: newEnd })
    .eq("id", eventId)
    .select("id");

  if (error) return { error: "Termin konnte nicht verschoben werden." };
  if (!data || data.length === 0) {
    return { error: "Keine Berechtigung, diesen Termin zu verschieben." };
  }

  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}

export async function confirmEventAction(eventId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();
  const role = await currentRole(supabase, userId);
  if (role !== "trainer" && role !== "admin") return { error: "Nur Trainer können Vorschläge bestätigen." };

  // A multi-day proposal is confirmed as a whole: every still-proposed day
  // of its series.
  const { data: event } = await supabase.from("events").select("series_id, status").eq("id", eventId).maybeSingle();
  const update = supabase.from("events").update({ status: "confirmed" });
  const { data, error } =
    event?.series_id && event.status === "proposed"
      ? await update.eq("series_id", event.series_id).eq("status", "proposed").select("id")
      : await update.eq("id", eventId).select("id");

  if (error) return { error: "Termin konnte nicht bestätigt werden." };
  if (!data || data.length === 0) {
    return { error: "Keine Berechtigung, diesen Termin zu bestätigen." };
  }

  revalidatePath("/trainer");
  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}

export async function deleteEventAction(
  eventId: string,
  // A multi-day proposal goes as a whole (like confirming it); confirmed
  // events, including days of a trainer's series, are deleted one by one.
  opts: { wholeProposal?: boolean } = {}
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { data: event } = opts.wholeProposal
    ? await supabase.from("events").select("series_id, status").eq("id", eventId).maybeSingle()
    : { data: null };
  const remove = supabase.from("events").delete();
  const { data, error } =
    event?.series_id && event.status === "proposed"
      ? await remove.eq("series_id", event.series_id).eq("status", "proposed").select("id")
      : await remove.eq("id", eventId).select("id");

  if (error) return { error: "Termin konnte nicht gelöscht werden." };
  if (!data || data.length === 0) {
    return { error: "Keine Berechtigung, diesen Termin zu löschen." };
  }

  revalidatePath("/trainer");
  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}
