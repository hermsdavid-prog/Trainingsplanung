"use server";

import { createHash } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Brute-force protection for password checks: failures are counted per
// e-mail (hashed, never stored in clear) and per client IP in the database
// (login_wait_seconds / login_record). If that bookkeeping itself fails the
// login still works — it must never lock everyone out.
async function attemptKeys(email: string): Promise<string[]> {
  const keys = [`email:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}`];
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
  if (ip) keys.push(`ip:${ip}`);
  return keys;
}

async function waitSeconds(supabase: Awaited<ReturnType<typeof createClient>>, keys: string[]): Promise<number> {
  const { data, error } = await supabase.rpc("login_wait_seconds", { p_keys: keys });
  return error || typeof data !== "number" ? 0 : data;
}

function tooManyAttempts(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Zu viele Fehlversuche. Bitte in ${minutes} ${minutes === 1 ? "Minute" : "Minuten"} erneut versuchen.`;
}

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
  const keys = await attemptKeys(email);
  const wait = await waitSeconds(supabase, keys);
  if (wait > 0) return { error: tooManyAttempts(wait), email };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  await supabase.rpc("login_record", { p_keys: keys, p_success: !error });

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

  // This form skips the current password, so it's only for the forced
  // first-login change; any later change goes through updatePasswordAction,
  // which re-checks the current password.
  const { data: profile } = await supabase.from("profiles").select("must_change_password").eq("id", user.id).single();
  if (!profile?.must_change_password) {
    return { error: "Bitte ändere dein Passwort in den Einstellungen (mit deinem aktuellen Passwort)." };
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

// Voluntary password change from within the app (as opposed to the forced
// first-login flow above) — re-verifies the current password via
// signInWithPassword before allowing the update, since the user is already
// authenticated and Supabase's updateUser() doesn't ask for it itself.
export async function updatePasswordAction(
  currentPassword: string,
  password: string,
  passwordConfirm: string
): Promise<ActionResult> {
  if (!currentPassword) {
    return { error: "Bitte aktuelles Passwort eingeben." };
  }
  if (password.length < 8) {
    return { error: "Das neue Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (password !== passwordConfirm) {
    return { error: "Die neuen Passwörter stimmen nicht überein." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "Nicht angemeldet." };
  }

  const keys = await attemptKeys(user.email);
  const wait = await waitSeconds(supabase, keys);
  if (wait > 0) return { error: tooManyAttempts(wait) };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  await supabase.rpc("login_record", { p_keys: keys, p_success: !verifyError });
  if (verifyError) {
    return { error: "Aktuelles Passwort ist falsch." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return { error: "Passwort konnte nicht geändert werden. Bitte erneut versuchen." };
  }

  return {};
}
