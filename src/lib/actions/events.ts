"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { weeklyOccurrences } from "@/lib/date";

export type ActionResult = { error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");
  return { supabase, userId: user.id };
}

export type CreateEventInput = {
  title: string;
  description: string;
  eventType: string;
  color: string;
  date: string;
  time: string;
  allDay: boolean;
  groupId: string | null;
  athleteId: string | null;
  repeatUntil: string | null;
};

export async function createEventAction(input: CreateEventInput): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();

  if (!input.title.trim() || !input.date) {
    return { error: "Bitte Titel und Datum angeben." };
  }

  const dates = input.repeatUntil
    ? weeklyOccurrences(input.date, input.repeatUntil)
    : [input.date];
  const seriesId = dates.length > 1 ? randomUUID() : null;

  const rows = dates.map((date) => ({
    title: input.title.trim(),
    description: input.description.trim() || null,
    event_type: input.eventType.trim() || "Termin",
    color: input.color,
    start_at: input.allDay ? `${date}T00:00:00Z` : `${date}T${input.time || "00:00"}:00Z`,
    all_day: input.allDay,
    group_id: input.groupId,
    athlete_id: input.athleteId,
    series_id: seriesId,
    status: "confirmed" as const,
    created_by: userId,
  }));

  const { error } = await supabase.from("events").insert(rows);
  if (error) return { error: "Termin konnte nicht angelegt werden." };

  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}

export async function proposeEventAction(input: {
  title: string;
  description: string;
  date: string;
  groupId: string;
}): Promise<ActionResult> {
  const { supabase, userId } = await requireUser();

  if (!input.title.trim() || !input.date || !input.groupId) {
    return { error: "Bitte Titel, Datum und Gruppe angeben." };
  }

  const { error } = await supabase.from("events").insert({
    title: input.title.trim(),
    description: input.description.trim() || null,
    event_type: "Vorschlag",
    color: "#94a3b8",
    start_at: `${input.date}T00:00:00Z`,
    all_day: true,
    group_id: input.groupId,
    athlete_id: userId,
    status: "proposed",
    created_by: userId,
  });

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
  const timePart = oldStart.toISOString().slice(11);
  const newStart = `${newDate}T${timePart}`;

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
    .select("start_at, end_at")
    .eq("id", eventId)
    .single();

  if (!existing) return { error: "Termin nicht gefunden." };

  const oldStart = new Date(existing.start_at);
  const timePart = oldStart.toISOString().slice(11);
  const newStart = `${newDate}T${timePart}`;

  let newEnd: string | null = null;
  if (existing.end_at) {
    const durationMs = new Date(existing.end_at).getTime() - oldStart.getTime();
    newEnd = new Date(new Date(newStart).getTime() + durationMs).toISOString();
  }

  const { error } = await supabase
    .from("events")
    .update({ start_at: newStart, end_at: newEnd })
    .eq("id", eventId);

  if (error) return { error: "Termin konnte nicht verschoben werden." };

  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}

export async function confirmEventAction(eventId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("events")
    .update({ status: "confirmed" })
    .eq("id", eventId);

  if (error) return { error: "Termin konnte nicht bestätigt werden." };

  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { error: "Termin konnte nicht gelöscht werden." };

  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}
