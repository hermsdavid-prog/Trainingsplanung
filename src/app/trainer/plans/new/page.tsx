import { createClient } from "@/lib/supabase/server";
import { CreatePlanForm } from "@/components/plans/create-plan-form";

export default async function NewPlanPage() {
  const supabase = await createClient();

  const [{ data: groups }, { data: groupAthletes }] = await Promise.all([
    supabase.from("groups").select("id, name").order("name"),
    supabase
      .from("group_athletes")
      .select("athlete_id, profiles(full_name)")
      .order("athlete_id"),
  ]);

  const athleteMap = new Map<string, string>();
  for (const row of groupAthletes ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries()).map(([id, full_name]) => ({
    id,
    full_name,
  }));

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">Neuer Trainingsplan</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Lege die Rahmendaten fest — die Übungstabelle folgt im nächsten Schritt.
      </p>
      <CreatePlanForm groups={groups ?? []} athletes={athletes} />
    </div>
  );
}
