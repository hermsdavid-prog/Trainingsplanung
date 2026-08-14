import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { ...profile, email: user.email ?? "" };
}
