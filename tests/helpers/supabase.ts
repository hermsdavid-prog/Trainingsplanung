import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Integration tests run against the same Supabase project the app uses in
// dev (see README "Bekannte Lücken" — there's no separate test database).
// Every fixture created here must be torn down by the test that created it.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} — integration tests read it from .env.local.`);
  return value;
}

export function createAdminClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function createAnonClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

let counter = 0;

export type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient<Database>;
  cleanup: () => Promise<void>;
};

// Creates a throwaway auth user + profile and returns a client already
// signed in as them — subject to the same RLS policies a real logged-in
// request would hit, unlike the admin client.
export async function createTestUser(
  admin: SupabaseClient<Database>,
  role: "admin" | "trainer" | "athlete"
): Promise<TestUser> {
  counter += 1;
  const email = `vitest-${Date.now()}-${counter}-${role}@example.com`;
  const password = `VitestTemp${Math.random().toString(36).slice(2)}!1`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Vitest ${role}`, role },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  const userId = data.user.id;

  const client = createAnonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return {
    id: userId,
    email,
    client,
    async cleanup() {
      await admin.auth.admin.deleteUser(userId);
    },
  };
}
