"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { dailyOccurrences } from "@/lib/date";
import type { ActionResult } from "@/lib/actions/events";

// A trainer reporting they'll be out — one all-day "Abwesenheit" event per
// day of the range, for every group they train (group_trainers), reusing
// the existing events table/calendar rendering instead of a parallel model.
// events_select RLS already shows confirmed group events to that group's
// athletes, so no RLS change is needed for it to show up on their calendars.
export async function reportTrainerAbsenceAction(input: {
  startDate: string;
  endDate: string;
  note: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  if (!input.startDate) return { error: "Bitte ein Startdatum angeben." };
  const endDate = input.endDate || input.startDate;
  if (endDate < input.startDate) return { error: "Das Enddatum muss nach dem Startdatum liegen." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "trainer" && profile?.role !== "admin") return { error: "Keine Berechtigung." };

  const { data: groupRows } = await supabase.from("group_trainers").select("group_id").eq("trainer_id", user.id);
  const groupIds = (groupRows ?? []).map((g) => g.group_id);
  if (groupIds.length === 0) return { error: "Du bist aktuell keiner Gruppe zugeordnet." };

  const dates = dailyOccurrences(input.startDate, endDate);
  const seriesId = dates.length * groupIds.length > 1 ? randomUUID() : null;
  const title = `${profile.full_name || "Trainer"} abwesend`;

  const rows = groupIds.flatMap((groupId) =>
    dates.map((date) => ({
      title,
      description: input.note.trim() || null,
      event_type: "Abwesenheit",
      color: "#dc2626",
      start_at: `${date}T00:00:00Z`,
      all_day: true,
      group_id: groupId,
      athlete_id: null,
      series_id: seriesId,
      status: "confirmed" as const,
      created_by: user.id,
    }))
  );

  const { error } = await supabase.from("events").insert(rows);
  if (error) return { error: "Abwesenheit konnte nicht gespeichert werden." };

  revalidatePath("/trainer/calendar");
  revalidatePath("/athlete/calendar");
  return {};
}
