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

// A trainer may only manage groups they are actually assigned to (or created);
// admins may manage any group. Prevents a trainer from mutating an arbitrary
// group_id they merely guessed or that isn't shown to them in the UI.
//
// When `requireHead` is set, and the group already has a head trainer, only
// that head trainer (or an admin) may proceed — matches the design's "Der
// Haupttrainer darf zusätzlich Gruppe und Team ändern." Groups that don't
// have a head trainer yet (e.g. created before this feature, or nobody has
// been promoted) fall back to the old behaviour so nobody gets locked out.
async function requireGroupManageAccess(groupId: string, options?: { requireHead?: boolean }) {
  const { supabase, userId, role } = await requireTrainerOrAdmin();

  if (role === "admin") return { supabase, userId, role };

  const { data: group } = await supabase
    .from("groups")
    .select("id, created_by")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) throw new Error("Gruppe nicht gefunden.");

  const { data: link } = await supabase
    .from("group_trainers")
    .select("group_id, is_head")
    .eq("group_id", groupId)
    .eq("trainer_id", userId)
    .maybeSingle();

  const isAssigned = !!link || group.created_by === userId;
  if (!isAssigned) throw new Error("Du verwaltest diese Gruppe nicht.");

  if (options?.requireHead) {
    const { data: headRow } = await supabase
      .from("group_trainers")
      .select("trainer_id")
      .eq("group_id", groupId)
      .eq("is_head", true)
      .maybeSingle();

    if (headRow && !link?.is_head) {
      throw new Error("Nur der Haupttrainer darf Gruppe und Team ändern.");
    }
  }

  return { supabase, userId, role };
}

export async function createGroupAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, userId, role } = await requireTrainerOrAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#6366f1");
  const shortName = String(formData.get("short_name") ?? "").trim();

  if (!name) {
    return { error: "Bitte einen Namen für die Gruppe angeben." };
  }

  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name,
      description: description || null,
      color,
      short_name: shortName || null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !group) {
    return { error: "Gruppe konnte nicht angelegt werden." };
  }

  // Trainers must be assigned to their own group, otherwise RLS hides it from them immediately.
  // The creator starts out as head trainer, matching the design's default.
  if (role === "trainer") {
    await supabase
      .from("group_trainers")
      .insert({ group_id: group.id, trainer_id: userId, is_head: true });
  }

  revalidatePath("/admin/groups");
  revalidatePath("/trainer/groups");
  return {};
}

export async function updateGroupAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const groupId = String(formData.get("group_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "#6366f1");
  const shortName = String(formData.get("short_name") ?? "").trim();

  if (!groupId || !name) {
    return { error: "Bitte einen Namen für die Gruppe angeben." };
  }

  const { supabase } = await requireGroupManageAccess(groupId, { requireHead: true });

  const { error } = await supabase
    .from("groups")
    .update({ name, description: description || null, color, short_name: shortName || null })
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
  const { supabase } = await requireGroupManageAccess(groupId, { requireHead: true });

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
  const { supabase } = await requireGroupManageAccess(groupId);

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

// Promotes a trainer to head trainer for a group. The unique partial index
// (one head per group) means we must clear any existing head first — two
// sequential updates, since Supabase doesn't expose client-side transactions.
export async function promoteHeadTrainerAction(
  groupId: string,
  trainerId: string
): Promise<ActionResult> {
  const { supabase } = await requireGroupManageAccess(groupId, { requireHead: true });

  const { error: clearError } = await supabase
    .from("group_trainers")
    .update({ is_head: false })
    .eq("group_id", groupId)
    .eq("is_head", true);
  if (clearError) return { error: "Haupttrainer konnte nicht geändert werden." };

  const { error } = await supabase
    .from("group_trainers")
    .update({ is_head: true })
    .eq("group_id", groupId)
    .eq("trainer_id", trainerId);
  if (error) return { error: "Haupttrainer konnte nicht gesetzt werden." };

  revalidatePath("/admin/groups");
  revalidatePath("/trainer/groups");
  return {};
}
