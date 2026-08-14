"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = { error?: string };

async function requireTrainerOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "trainer") {
    throw new Error("Keine Berechtigung.");
  }

  return { supabase, userId: user.id, role: profile.role };
}

export async function createGroupAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, userId, role } = await requireTrainerOrAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#6366f1");

  if (!name) {
    return { error: "Bitte einen Namen für die Gruppe angeben." };
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, description: description || null, color, created_by: userId })
    .select("id")
    .single();

  if (error || !group) {
    return { error: "Gruppe konnte nicht angelegt werden." };
  }

  // Trainers must be assigned to their own group, otherwise RLS hides it from them immediately.
  if (role === "trainer") {
    await supabase
      .from("group_trainers")
      .insert({ group_id: group.id, trainer_id: userId });
  }

  revalidatePath("/admin/groups");
  revalidatePath("/trainer/groups");
  return {};
}

export async function updateGroupAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase } = await requireTrainerOrAdmin();

  const groupId = String(formData.get("group_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#6366f1");

  if (!groupId || !name) {
    return { error: "Bitte einen Namen für die Gruppe angeben." };
  }

  const { error } = await supabase
    .from("groups")
    .update({ name, description: description || null, color })
    .eq("id", groupId);

  if (error) {
    return { error: "Gruppe konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/groups");
  revalidatePath("/trainer/groups");
  return {};
}

export async function deleteGroupAction(groupId: string): Promise<ActionResult> {
  const { supabase, role } = await requireTrainerOrAdmin();
  if (role !== "admin") {
    return { error: "Nur Admins dürfen Gruppen löschen." };
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) {
    return { error: "Gruppe konnte nicht gelöscht werden." };
  }

  revalidatePath("/admin/groups");
  revalidatePath("/trainer/groups");
  return {};
}

export async function setGroupTrainerAction(
  groupId: string,
  trainerId: string,
  assign: boolean
): Promise<ActionResult> {
  const { supabase } = await requireTrainerOrAdmin();

  const { error } = assign
    ? await supabase.from("group_trainers").insert({ group_id: groupId, trainer_id: trainerId })
    : await supabase
        .from("group_trainers")
        .delete()
        .eq("group_id", groupId)
        .eq("trainer_id", trainerId);

  if (error) return { error: "Änderung konnte nicht gespeichert werden." };

  revalidatePath("/admin/groups");
  revalidatePath("/trainer/groups");
  return {};
}

export async function setGroupAthleteAction(
  groupId: string,
  athleteId: string,
  assign: boolean
): Promise<ActionResult> {
  const { supabase } = await requireTrainerOrAdmin();

  const { error } = assign
    ? await supabase.from("group_athletes").insert({ group_id: groupId, athlete_id: athleteId })
    : await supabase
        .from("group_athletes")
        .delete()
        .eq("group_id", groupId)
        .eq("athlete_id", athleteId);

  if (error) return { error: "Änderung konnte nicht gespeichert werden." };

  revalidatePath("/admin/groups");
  revalidatePath("/trainer/groups");
  return {};
}
