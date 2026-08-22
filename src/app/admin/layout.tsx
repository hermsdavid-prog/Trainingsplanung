import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { AdminShell } from "@/components/shell/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/");

  return <AdminShell fullName={profile.full_name}>{children}</AdminShell>;
}
