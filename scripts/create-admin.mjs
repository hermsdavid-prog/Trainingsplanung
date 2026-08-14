// One-off bootstrap script: creates the very first admin account.
// Usage: node scripts/create-admin.mjs "Vollständiger Name" "email@example.com"
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

const [fullName, email] = process.argv.slice(2);
if (!fullName || !email) {
  console.error('Usage: node scripts/create-admin.mjs "Vollständiger Name" "email@example.com"');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!?#%*+-";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

const tempPassword = generatePassword();

const { error } = await supabase.auth.admin.createUser({
  email,
  password: tempPassword,
  email_confirm: true,
  user_metadata: { full_name: fullName, role: "admin" },
});

if (error) {
  console.error("Fehler:", error.message);
  process.exit(1);
}

console.log("Admin-Account angelegt:");
console.log("  E-Mail:   ", email);
console.log("  Passwort: ", tempPassword);
console.log("(Beim ersten Login muss das Passwort geändert werden.)");
