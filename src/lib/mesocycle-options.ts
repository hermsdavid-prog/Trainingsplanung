import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { formatDateCompact, shiftDateISO } from "@/lib/date";

export type MesocycleOption = { id: string; title: string };

// The Mesozyklen a training may be assigned to: a group training only to
// its group's; an Einzeltraining to the athlete's personal ones AND to
// those of every group the athlete belongs to — an extra session an
// athlete does on their own still counts toward the group's block.
// Used both for the picker and to validate a submitted choice server-side.
export async function mesocycleOptionsForPlan(
  supabase: SupabaseClient<Database>,
  plan: { scope_type: string; group_id: string | null; athlete_id: string | null }
): Promise<MesocycleOption[]> {
  const cols = "id, title, start_date, weeks, group_id, groups(name)";

  if (plan.scope_type === "group" && plan.group_id) {
    const { data } = await supabase
      .from("training_mesocycles")
      .select(cols)
      .eq("group_id", plan.group_id)
      .order("start_date", { ascending: false });
    return (data ?? []).map((m) => ({ id: m.id, title: `${m.title} (${rangeLabel(m.start_date, m.weeks)})` }));
  }

  if (plan.scope_type === "athlete" && plan.athlete_id) {
    const { data: memberships } = await supabase.from("group_athletes").select("group_id").eq("athlete_id", plan.athlete_id);
    const groupIds = (memberships ?? []).map((g) => g.group_id);
    const filter = groupIds.length
      ? `athlete_id.eq.${plan.athlete_id},group_id.in.(${groupIds.join(",")})`
      : `athlete_id.eq.${plan.athlete_id}`;
    const { data } = await supabase
      .from("training_mesocycles")
      .select(cols)
      .or(filter)
      .order("start_date", { ascending: false });
    return (data ?? []).map((m) => ({
      id: m.id,
      title: `${m.title} (${rangeLabel(m.start_date, m.weeks)}) · ${m.group_id ? (m.groups?.name ?? "Gruppe") : "persönlich"}`,
    }));
  }

  return [];
}

function rangeLabel(startDate: string, weeks: number) {
  return `${formatDateCompact(startDate)}–${formatDateCompact(shiftDateISO(startDate, weeks * 7 - 1))}`;
}
