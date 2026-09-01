"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { error?: undefined };
export type LoginActionResult = ActionResult & { email?: string };

export async function loginAction(
  _prevState: LoginActionResult,
  formData: FormData
): Promise<LoginActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // React resets uncontrolled form fields after every action dispatch, so
    // without echoing the email back the field would go blank alongside the
    // (intentionally cleared) password on a failed login attempt.
    return { error: "E-Mail oder Passwort ist falsch.", email };
  }

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePasswordAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (password !== passwordConfirm) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: "Passwort konnte nicht geändert werden. Bitte erneut versuchen." };
  }

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  redirect("/");
}
