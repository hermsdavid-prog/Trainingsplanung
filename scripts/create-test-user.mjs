// Dev helper: node scripts/create-test-user.mjs "Name" "email@example.com" trainer|athlete
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvLocal() {
  const content = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) process.env[match[1]] ??= match[2].trim();
  }
}
loadEnvLocal();

const [fullName, email, role] = process.argv.slice(2);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { error } = await supabase.auth.admin.createUser({
  email,
  password: "Testpasswort123!",
  email_confirm: true,
  user_metadata: { full_name: fullName, role },
});

if (error) {
  console.error("Fehler:", error.message);
  process.exit(1);
}
console.log("Angelegt:", email, role);
