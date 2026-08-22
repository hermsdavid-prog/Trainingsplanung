"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ConsentResult = { error?: string };

export type MyConsent = {
  role: "admin" | "trainer" | "athlete";
  termsAccepted: boolean;
  healthConsent: boolean;
  consentedAt: string | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return { supabase, userId: user.id, role: profile.role };
}

// Reads the current user's consent row (any role — the table name is a
// historical artefact, RLS scopes it by auth.uid() regardless of role).
export async function getMyConsentAction(): Promise<MyConsent> {
  const { supabase, userId, role } = await requireUser();

  const { data } = await supabase
    .from("athlete_consents")
    .select("terms_accepted, health_consent, consented_at")
    .eq("athlete_id", userId)
    .maybeSingle();

  return {
    role,
    termsAccepted: data?.terms_accepted ?? false,
    healthConsent: data?.health_consent ?? false,
    consentedAt: data?.consented_at ?? null,
  };
}

// Upserts the current user's consent. Only athletes are ever asked about
// health_consent — trainers/admins only need terms_accepted. consented_at is
// only set on first acceptance and never overwritten afterwards.
export async function submitConsentAction(
  termsAccepted: boolean,
  healthConsent: boolean
): Promise<ConsentResult> {
  const { supabase, userId, role } = await requireUser();

  if (!termsAccepted) {
    return { error: "Der Datenschutzerklärung musst du zustimmen." };
  }

  const { data: existing } = await supabase
    .from("athlete_consents")
    .select("consented_at")
    .eq("athlete_id", userId)
    .maybeSingle();

  const { error } = await supabase.from("athlete_consents").upsert({
    athlete_id: userId,
    terms_accepted: true,
    health_consent: role === "athlete" ? healthConsent : false,
    consented_at: existing?.consented_at ?? new Date().toISOString(),
  });

  if (error) {
    return { error: "Zustimmung konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

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
    throw new Error("Nur Admins dürfen diese Einstellung ändern.");
  }

  return supabase;
}

const RETENTION_KEY = "health_data_retention";

// Admin-only: updates the health-data retention period shown on the admin
// "Datenschutz" panel. RLS restricts writes on app_settings to admins.
export async function updateRetentionAction(
  _prevState: ConsentResult,
  formData: FormData
): Promise<ConsentResult> {
  const supabase = await requireAdmin();

  const value = String(formData.get("value") ?? "").trim();
  if (!value) {
    return { error: "Bitte einen Wert angeben." };
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: RETENTION_KEY, value, updated_at: new Date().toISOString() });

  if (error) {
    return { error: "Konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/users");
  return {};
}
