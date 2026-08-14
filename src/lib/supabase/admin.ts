import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Uses the service_role key — bypasses RLS entirely. Never import this
// module from a Client Component or expose it to the browser bundle.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
