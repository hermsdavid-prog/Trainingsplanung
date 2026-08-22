import { createClient } from "@/lib/supabase/server";
import { NewPlanFlow, type PlanTemplateSummary } from "@/components/plans/new-plan-flow";
import { PLAN_TYPES, isValidPlanType } from "@/lib/plan-type";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; date?: string }>;
}) {
  const { type, date } = await searchParams;
  const defaultCategory = isValidPlanType(type ?? "") ? (type as string) : PLAN_TYPES[0];
  const supabase = await createClient();

  const [{ data: groups }, { data: groupAthletes }, { data: templateRows }] = await Promise.all([
    supabase.from("groups").select("id, name").order("name"),
    supabase
      .from("group_athletes")
      .select("athlete_id, profiles(full_name)")
      .order("athlete_id"),
    supabase
      .from("plan_templates")
      .select("id, title, usage_note, items")
      .eq("category_label", defaultCategory)
      .order("created_at"),
  ]);

  const athleteMap = new Map<string, string>();
  for (const row of groupAthletes ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries()).map(([id, full_name]) => ({
    id,
    full_name,
  }));

  const templates: PlanTemplateSummary[] = (templateRows ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    usage_note: t.usage_note,
    itemCount: Array.isArray(t.items) ? t.items.length : 0,
  }));

  return (
    <div className="max-w-[700px]">
      <NewPlanFlow
        templates={templates}
        groups={groups ?? []}
        athletes={athletes}
        defaultCategory={defaultCategory}
        defaultDate={date}
      />
    </div>
  );
}
