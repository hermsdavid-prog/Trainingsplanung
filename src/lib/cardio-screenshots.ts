import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Heart-rate screenshots for cardio items live in a private Storage bucket
// (not the Postgres DB), laid out as <athlete_id>/<plan_item_id>/<ts>.jpg —
// the first folder is what the storage.objects RLS policies key on.
export const CARDIO_SCREENSHOT_BUCKET = "cardio-screenshots";

// Screenshots are removed automatically after roughly six months so the
// free Supabase Storage quota (1 GB) is never outgrown.
export const CARDIO_SCREENSHOT_RETENTION_DAYS = 183;

export function cardioScreenshotPath(athleteId: string, itemId: string) {
  return `${athleteId}/${itemId}/${Date.now()}.jpg`;
}

// Private bucket → short-lived signed URLs, created with the viewer's own
// session so the storage RLS decides who may see which athlete's images.
export async function signCardioScreenshots(
  supabase: SupabaseClient<Database>,
  paths: string[]
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await supabase.storage.from(CARDIO_SCREENSHOT_BUCKET).createSignedUrls(paths, 60 * 60);
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}
