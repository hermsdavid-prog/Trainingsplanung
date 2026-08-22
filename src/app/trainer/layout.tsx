import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { TrainerShell } from "@/components/shell/trainer-shell";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== "trainer") redirect("/");

  return (
    <TrainerShell role={profile.role} fullName={profile.full_name}>
      {children}
    </TrainerShell>
  );
}
