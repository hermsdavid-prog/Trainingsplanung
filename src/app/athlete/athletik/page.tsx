import { createClient } from "@/lib/supabase/server";
import { AthletikProgress } from "@/components/athletik/athletik-progress";

export default async function AthleteAthletikPage({
  searchParams,
}: {
  searchParams: Promise<{ exercise?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return <AthletikProgress userId={user.id} exerciseParam={params.exercise} />;
}
