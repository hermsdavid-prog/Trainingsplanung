"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CARDIO_SCREENSHOT_BUCKET, CARDIO_SCREENSHOT_RETENTION_DAYS } from "@/lib/cardio-screenshots";

export type ActionResult = { error?: string };

export async function upsertFeedbackAction(
  itemId: string,
  data: { actual_value?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("athlete_feedback").upsert(
    {
      training_plan_item_id: itemId,
      athlete_id: user.id,
      ...data,
    },
    { onConflict: "training_plan_item_id,athlete_id" }
  );

  if (error) return { error: "Speichern fehlgeschlagen." };
  return {};
}

// The browser uploads the (already compressed) image straight to Storage —
// server actions cap request bodies at 1 MB — and then calls this to link
// the file to the athlete's feedback row. A previous screenshot for the
// same item is replaced, and its file removed.
export async function setCardioScreenshotAction(itemId: string, path: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (!path.startsWith(`${user.id}/${itemId}/`)) return { error: "Ungültiger Dateipfad." };

  const { data: existing } = await supabase
    .from("athlete_feedback")
    .select("screenshot_path")
    .eq("training_plan_item_id", itemId)
    .eq("athlete_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("athlete_feedback").upsert(
    {
      training_plan_item_id: itemId,
      athlete_id: user.id,
      screenshot_path: path,
      screenshot_uploaded_at: new Date().toISOString(),
    },
    { onConflict: "training_plan_item_id,athlete_id" }
  );
  if (error) {
    await supabase.storage.from(CARDIO_SCREENSHOT_BUCKET).remove([path]);
    return { error: "Screenshot konnte nicht gespeichert werden." };
  }

  if (existing?.screenshot_path && existing.screenshot_path !== path) {
    await supabase.storage.from(CARDIO_SCREENSHOT_BUCKET).remove([existing.screenshot_path]);
  }

  await purgeExpiredCardioScreenshots();
  return {};
}

export async function removeCardioScreenshotAction(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: existing } = await supabase
    .from("athlete_feedback")
    .select("screenshot_path")
    .eq("training_plan_item_id", itemId)
    .eq("athlete_id", user.id)
    .maybeSingle();
  if (!existing?.screenshot_path) return {};

  const { error } = await supabase
    .from("athlete_feedback")
    .update({ screenshot_path: null, screenshot_uploaded_at: null })
    .eq("training_plan_item_id", itemId)
    .eq("athlete_id", user.id);
  if (error) return { error: "Screenshot konnte nicht entfernt werden." };

  await supabase.storage.from(CARDIO_SCREENSHOT_BUCKET).remove([existing.screenshot_path]);
  return {};
}

// Retention sweep, piggybacked on uploads instead of a cron job: every new
// screenshot first clears out everything older than the retention window
// (including files whose plan was deleted in the meantime). With no uploads
// nothing grows, so the bucket stays bounded either way. Best-effort — a
// failure here must never fail the athlete's upload.
async function purgeExpiredCardioScreenshots() {
  try {
    const admin = createAdminClient();
    const { data: expired } = await admin.rpc("expired_cardio_screenshots", {
      max_age: `${CARDIO_SCREENSHOT_RETENTION_DAYS} days`,
    });
    if (!expired?.length) return;
    const { error } = await admin.storage.from(CARDIO_SCREENSHOT_BUCKET).remove(expired);
    if (error) return;
    await admin
      .from("athlete_feedback")
      .update({ screenshot_path: null, screenshot_uploaded_at: null })
      .in("screenshot_path", expired);
  } catch {
    // ignore — retried on the next upload
  }
}
