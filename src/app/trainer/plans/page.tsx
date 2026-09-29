import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanListFilters } from "@/components/plans/plan-list-filters";
import { PlanMesocycleGroups, type PlanGroupRow, type PlanMesocycleSection } from "@/components/plans/plan-mesocycle-groups";
import { todayISO, isMesocycleCurrent } from "@/lib/date";
import { PLAN_TYPES, isValidPlanType } from "@/lib/plan-type";

type PlanGroup = PlanGroupRow & {
  scopeType: string;
  mesocycleId: string | null;
};

export default async function TrainerPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; group?: string; athlete?: string }>;
}) {
  const { type, group: groupFilter, athlete: athleteFilter } = await searchParams;
  const category = isValidPlanType(type ?? "") ? (type as string) : PLAN_TYPES[0];
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let plansQuery = supabase
    .from("training_plans")
    .select(
      "id, title, category_label, date, time, scope_type, created_by, group_id, athlete_id, series_id, mesocycle_id, groups(name), profiles!training_plans_athlete_id_fkey(full_name)"
    )
    .eq("category_label", category);
  if (groupFilter) plansQuery = plansQuery.eq("group_id", groupFilter);
  if (athleteFilter) plansQuery = plansQuery.eq("athlete_id", athleteFilter);

  // Capped so this list stays fast as plan history grows; older plans are still
  // reachable via the calendar's date navigation.
  const [{ data: plans }, { data: profile }, { data: allGroups }, { data: groupAthleteRows }] = await Promise.all([
    plansQuery.order("date", { ascending: false }).limit(300),
    currentUser
      ? supabase.from("profiles").select("role").eq("id", currentUser.id).single()
      : Promise.resolve({ data: null }),
    supabase.from("groups").select("id, name").order("name"),
    supabase.from("group_athletes").select("athlete_id, profiles(full_name)"),
  ]);

  const athleteMap = new Map<string, string>();
  for (const row of groupAthleteRows ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries())
    .map(([id, full_name]) => ({ id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const isKarate = category === "Sportartspezifisch";

  // A weekly-repeat series (shared series_id) and ad-hoc copies ("Plan
  // kopieren", or the calendar's drag-to-copy) both produce one
  // training_plans row per date with otherwise-identical content. Listing
  // every occurrence separately buries the list in repeats of the same
  // training, so occurrences that are clearly "the same training" collapse
  // into a single row with all of its dates shown together.
  const groupsByKey = new Map<string, PlanGroup>();
  for (const plan of plans ?? []) {
    const key =
      plan.series_id ??
      `adhoc:${plan.title}::${plan.scope_type}::${plan.group_id ?? plan.athlete_id ?? ""}`;
    const forLabel =
      plan.scope_type === "group" ? (plan.groups?.name ?? "—") : (plan.profiles?.full_name ?? "—");
    const occurrence = { id: plan.id, date: plan.date, created_by: plan.created_by };
    const existing = groupsByKey.get(key);
    if (existing) {
      existing.occurrences.push(occurrence);
      // Occurrences past the end of a Mesozyklus are left unassigned (copies
      // only inherit a block they fall inside), so file the whole row under
      // the block its assigned occurrences share rather than under
      // "Ohne Mesozyklus" just because the newest date lies beyond it.
      if (!existing.mesocycleId && plan.mesocycle_id) existing.mesocycleId = plan.mesocycle_id;
    } else {
      groupsByKey.set(key, {
        key,
        title: plan.title,
        time: plan.time,
        scopeType: plan.scope_type,
        forLabel,
        // Filled in from a later occurrence if this one has none (see above).
        mesocycleId: plan.mesocycle_id,
        occurrences: [occurrence],
      });
    }
  }

  const groups = Array.from(groupsByKey.values());
  for (const group of groups) {
    // Newest first everywhere — including the "N Termine" dropdown.
    group.occurrences.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }
  groups.sort((a, b) => {
    const aLatest = a.occurrences[0].date;
    const bLatest = b.occurrences[0].date;
    return aLatest < bLatest ? 1 : aLatest > bLatest ? -1 : 0;
  });

  // Group by Mesozyklus so the list reads as a handful of collapsible blocks
  // instead of one long chronological table — only Mesozyklen that actually
  // have a training in this category show up here (unlike the dedicated
  // Mesozyklen tab, which lists every one regardless of content). Trainings
  // with no mesocycle_id land in a permanent "Ohne Mesozyklus" bucket rather
  // than disappearing among the others.
  const mesocycleIds = Array.from(new Set(groups.map((g) => g.mesocycleId).filter((id): id is string => !!id)));
  const { data: mesocycleRows } = mesocycleIds.length
    ? await supabase
        .from("training_mesocycles")
        .select("id, title, start_date, weeks, groups(name, color), profiles!training_mesocycles_athlete_id_fkey(full_name)")
        .in("id", mesocycleIds)
    : { data: [] };

  const today = todayISO();
  const sections: PlanMesocycleSection[] = (mesocycleRows ?? [])
    .map((m) => {
      const isCurrent = isMesocycleCurrent(m.start_date, m.weeks, today);
      return {
        mesocycleId: m.id,
        title: m.title,
        startDate: m.start_date,
        weeks: m.weeks,
        isCurrent,
        // Who the block belongs to, visible while the section is collapsed.
        scopeLabel: m.groups?.name ?? (m.profiles?.full_name ? `Persönlich · ${m.profiles.full_name}` : "Persönlich"),
        scopeColor: m.groups?.color ?? null,
        groups: groups.filter((g) => g.mesocycleId === m.id),
      };
    })
    // Strictly newest → oldest by start date.
    .sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0));
  const unassignedGroups = groups.filter((g) => !g.mesocycleId);

  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className={isKarate ? "kicker-accent-2" : "kicker"}>
            Trainingspläne
          </div>
          <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">
            {isKarate ? "Karate" : "Athletik"}
          </h2>
        </div>
        <Link href={`/trainer/plans/new?type=${encodeURIComponent(category)}`} className="btn btn-primary">
          Neues Training anlegen
        </Link>
      </div>

      <div className="mt-5">
        <PlanListFilters groups={allGroups ?? []} athletes={athletes} selectedGroup={groupFilter} selectedAthlete={athleteFilter} />
      </div>

      <PlanMesocycleGroups
        sections={sections}
        unassigned={unassignedGroups}
        // The list query is already RLS-scoped to plans this trainer can see
        // (their own groups, plus those groups' athletes' own trainings) —
        // any trainer/admin viewing a row here may also delete it, matching
        // requirePlanEditAccess.
        canDelete={profile?.role === "admin" || profile?.role === "trainer"}
        emptyMessage={
          groupFilter || athleteFilter ? "Keine Trainingspläne für diese Auswahl." : "Noch keine Trainingspläne angelegt."
        }
      />
    </div>
  );
}
