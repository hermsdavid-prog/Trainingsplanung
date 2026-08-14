"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = { error?: string };

export async function upsertHealthLogAction(input: {
  date: string;
  hrv: string;
  restingHr: string;
  wellbeing: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  if (!input.wellbeing || input.wellbeing < 1 || input.wellbeing > 10) {
    return { error: "Bitte Wohlbefinden auf einer Skala von 1-10 angeben." };
  }

  const { error } = await supabase.from("health_logs").upsert(
    {
      athlete_id: user.id,
      date: input.date,
      hrv: input.hrv ? Number(input.hrv) : null,
      resting_hr: input.restingHr ? Number(input.restingHr) : null,
      wellbeing: input.wellbeing,
    },
    { onConflict: "athlete_id,date" }
  );

  if (error) return { error: "Speichern fehlgeschlagen." };

  revalidatePath("/athlete");
  revalidatePath("/trainer/health");
  return {};
}
