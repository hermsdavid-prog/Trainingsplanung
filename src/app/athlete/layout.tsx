import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { AthleteShell } from "@/components/shell/athlete-shell";

export default async function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== "athlete") redirect("/");

  return <AthleteShell fullName={profile.full_name}>{children}</AthleteShell>;
}
