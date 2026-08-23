"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

export type CreateUserResult = {
  error?: string;
  email?: string;
  tempPassword?: string;
};

async function requireAdmin() {
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

  if (profile?.role !== "admin") {
    throw new Error("Nur Admins dürfen Accounts verwalten.");
  }

  return user.id;
}

export async function createUserAction(
  _prevState: CreateUserResult,
  formData: FormData
): Promise<CreateUserResult> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!email || !fullName) {
    return { error: "Bitte Name und E-Mail-Adresse ausfüllen." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }
  if (!["admin", "trainer", "athlete"].includes(role)) {
    return { error: "Bitte eine gültige Rolle wählen." };
  }

  const tempPassword = generateTempPassword();
  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      return { error: "Diese E-Mail-Adresse ist bereits vergeben." };
    }
    console.error("createUserAction failed:", error);
    return { error: "Account konnte nicht angelegt werden. Bitte erneut versuchen." };
  }

  revalidatePath("/admin/users");
  return { email, tempPassword };
}

export type DeleteUserResult = { error?: string };

export async function deleteUserAction(userId: string): Promise<DeleteUserResult> {
  const adminId = await requireAdmin();

  if (userId === adminId) {
    return { error: "Du kannst deinen eigenen Account nicht löschen." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    console.error("deleteUserAction failed:", error);
    return { error: "Account konnte nicht gelöscht werden. Bitte erneut versuchen." };
  }

  revalidatePath("/admin/users");
  return {};
}
