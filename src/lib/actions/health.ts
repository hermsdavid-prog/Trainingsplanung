"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkHealthBadges, type BadgeAward } from "@/lib/badges";

export type ActionResult = { error?: string };

export async function upsertHealthLogAction(input: {
  date: string;
  hrv: string;
  restingHr: string;
  wellbeing: number;
}): Promise<ActionResult & { newBadges?: BadgeAward[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  // Health data only with consent (also enforced by RLS on health_logs).
  const { data: consent } = await supabase
    .from("athlete_consents")
    .select("health_consent")
    .eq("athlete_id", user.id)
    .maybeSingle();
  if (!consent?.health_consent) {
    return { error: "Für Gesundheitswerte fehlt deine Einwilligung (Einstellungen → Datenschutz → Einwilligung ändern)." };
  }

  if (!input.wellbeing || input.wellbeing < 1 || input.wellbeing > 10) {
    return { error: "Bitte Wohlbefinden auf einer Skala von 1-10 angeben." };
  }

  const hrv = input.hrv.trim() ? Number(input.hrv) : null;
  if (hrv !== null && (!Number.isFinite(hrv) || hrv < 0)) {
    return { error: "Bitte einen gültigen HRV-Wert angeben." };
  }

  const restingHr = input.restingHr.trim() ? Number(input.restingHr) : null;
  if (restingHr !== null && (!Number.isFinite(restingHr) || restingHr < 0)) {
    return { error: "Bitte einen gültigen Ruhepuls angeben." };
  }

  const { error } = await supabase.from("health_logs").upsert(
    {
      athlete_id: user.id,
      date: input.date,
      hrv,
      resting_hr: restingHr,
      wellbeing: input.wellbeing,
    },
    { onConflict: "athlete_id,date" }
  );

  if (error) return { error: "Speichern fehlgeschlagen." };

  revalidatePath("/athlete");
  revalidatePath("/trainer/athletes");

  const newBadges = await checkHealthBadges(supabase, user.id);
  return newBadges.length > 0 ? { newBadges } : {};
}
