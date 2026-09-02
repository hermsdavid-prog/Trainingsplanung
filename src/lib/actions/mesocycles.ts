"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/plans";

async function requireScopeAccess(
  scopeType: "group" | "athlete",
  groupId: string | null,
  athleteId: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "trainer") throw new Error("Keine Berechtigung.");

  if (profile.role === "admin") return { supabase, userId: user.id };

  let canAccess = false;
  if (scopeType === "group" && groupId) {
    const { data } = await supabase
      .from("group_trainers")
      .select("group_id")
      .eq("trainer_id", user.id)
      .eq("group_id", groupId)
      .maybeSingle();
    canAccess = !!data;
  } else if (scopeType === "athlete" && athleteId) {
    const { data: athleteGroups } = await supabase.from("group_athletes").select("group_id").eq("athlete_id", athleteId);
    const groupIds = (athleteGroups ?? []).map((g) => g.group_id);
    if (groupIds.length > 0) {
      const { data } = await supabase.from("group_trainers").select("group_id").eq("trainer_id", user.id).in("group_id", groupIds);
      canAccess = (data ?? []).length > 0;
    }
  }

  if (!canAccess) throw new Error("Keine Berechtigung für diese Gruppe/diesen Athleten.");
  return { supabase, userId: user.id };
}

export async function createMesocycleAction(input: {
  title: string;
  description: string;
  startDate: string;
  weeks: number;
  scopeType: "group" | "athlete";
  targetId: string;
}): Promise<ActionResult> {
  const title = input.title.trim();
  const description = input.description.trim();
  const startDate = input.startDate;
  const weeks = input.weeks;
  const scopeType = input.scopeType;
  const groupId = scopeType === "group" ? input.targetId || null : null;
  const athleteId = scopeType === "athlete" ? input.targetId || null : null;

  if (!title) return { error: "Bitte einen Titel angeben." };
  if (!startDate) return { error: "Bitte ein Startdatum angeben." };
  if (!Number.isInteger(weeks) || weeks < 1) return { error: "Bitte eine gültige Anzahl Wochen angeben." };
  if (scopeType !== "group" && scopeType !== "athlete") return { error: "Bitte Gruppe oder Athlet wählen." };
  if (scopeType === "group" && !groupId) return { error: "Bitte eine Gruppe wählen." };
  if (scopeType === "athlete" && !athleteId) return { error: "Bitte einen Athleten wählen." };

  let supabase, userId;
  try {
    ({ supabase, userId } = await requireScopeAccess(scopeType, groupId, athleteId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Keine Berechtigung." };
  }

  const { error } = await supabase.from("training_mesocycles").insert({
    title,
    description: description || null,
    start_date: startDate,
    weeks,
    scope_type: scopeType,
    group_id: groupId,
    athlete_id: athleteId,
    created_by: userId,
  });

  if (error) return { error: "Mesozyklus konnte nicht angelegt werden." };

  revalidatePath("/trainer/mesocycles");
  return {};
}

export async function updateMesocycleAction(
  mesocycleId: string,
  input: { title: string; description: string; startDate: string; weeks: number }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const title = input.title.trim();
  const description = input.description.trim();
  const startDate = input.startDate;
  const weeks = input.weeks;

  if (!mesocycleId) return { error: "Mesozyklus nicht gefunden." };
  if (!title) return { error: "Bitte einen Titel angeben." };
  if (!startDate) return { error: "Bitte ein Startdatum angeben." };
  if (!Number.isInteger(weeks) || weeks < 1) {
    return { error: "Bitte eine gültige Anzahl Wochen angeben." };
  }

  const { error } = await supabase
    .from("training_mesocycles")
    .update({ title, description: description || null, start_date: startDate, weeks })
    .eq("id", mesocycleId);

  if (error) return { error: "Änderungen konnten nicht gespeichert werden." };

  revalidatePath("/trainer/mesocycles");
  return {};
}

export async function deleteMesocycleAction(mesocycleId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("training_mesocycles").delete().eq("id", mesocycleId);
  if (error) return { error: "Mesozyklus konnte nicht gelöscht werden." };

  revalidatePath("/trainer/mesocycles");
  revalidatePath("/trainer/plans");
  return {};
}
