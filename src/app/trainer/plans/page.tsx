import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeletePlanRowButton } from "@/components/plans/delete-plan-row-button";
import { PlanOccurrenceDropdown } from "@/components/plans/plan-occurrence-dropdown";
import { formatDateShort } from "@/lib/date";
import { PLAN_TYPES, isValidPlanType } from "@/lib/plan-type";

const MUTED = { color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" };

type PlanGroup = {
  key: string;
  title: string;
  time: string | null;
  scopeType: string;
  forLabel: string;
  occurrences: { id: string; date: string; created_by: string | null }[];
};

export default async function TrainerPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const category = isValidPlanType(type ?? "") ? (type as string) : PLAN_TYPES[0];
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Capped so this list stays fast as plan history grows; older plans are still
  // reachable via the calendar's date navigation.
  const [{ data: plans }, { data: profile }] = await Promise.all([
    supabase
      .from("training_plans")
      .select(
        "id, title, category_label, date, time, scope_type, created_by, group_id, athlete_id, series_id, groups(name), profiles!training_plans_athlete_id_fkey(full_name)"
      )
      .eq("category_label", category)
      .order("date", { ascending: false })
      .limit(300),
    currentUser
      ? supabase.from("profiles").select("role").eq("id", currentUser.id).single()
      : Promise.resolve({ data: null }),
  ]);

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
    } else {
      groupsByKey.set(key, {
        key,
        title: plan.title,
        time: plan.time,
        scopeType: plan.scope_type,
        forLabel,
        occurrences: [occurrence],
      });
    }
  }

  const groups = Array.from(groupsByKey.values());
  for (const group of groups) {
    group.occurrences.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  groups.sort((a, b) => {
    const aLatest = a.occurrences[a.occurrences.length - 1].date;
    const bLatest = b.occurrences[b.occurrences.length - 1].date;
    return aLatest < bLatest ? 1 : aLatest > bLatest ? -1 : 0;
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className={isKarate ? "kicker-accent-2" : "kicker"}>
            {isKarate ? "Sportartspezifisch" : "Alle Gruppen"}
          </div>
          <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">
            {isKarate ? "Karate" : "Athletik"}
          </h2>
        </div>
        <Link href={`/trainer/plans/new?type=${encodeURIComponent(category)}`} className="btn btn-primary">
          Neues Training anlegen
        </Link>
      </div>

      <div className="mt-7 overflow-x-auto">
        <table className="table" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Zeit</th>
              <th>Titel</th>
              <th>Für</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              if (group.occurrences.length === 1) {
                const plan = group.occurrences[0];
                const canDelete =
                  profile?.role === "admin" ||
                  plan.created_by === currentUser?.id ||
                  group.scopeType === "group";
                return (
                  <tr key={group.key}>
                    <td style={MUTED}>{formatDateShort(plan.date)}</td>
                    <td style={MUTED}>{group.time || "—"}</td>
                    <td className="text-[15px]">{group.title}</td>
                    <td className="text-sm" style={MUTED}>
                      {group.forLabel}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/trainer/plans/${plan.id}/edit`} className="btn btn-ghost">
                          bearbeiten
                        </Link>
                        {canDelete && <DeletePlanRowButton planId={plan.id} title={group.title} />}
                      </div>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={group.key}>
                  <td colSpan={2}>
                    <PlanOccurrenceDropdown occurrences={group.occurrences} />
                  </td>
                  <td className="text-[15px]">
                    {group.title}
                    {group.time && (
                      <div className="mt-0.5 text-xs" style={MUTED}>
                        {group.time}
                      </div>
                    )}
                  </td>
                  <td className="text-sm" style={MUTED}>
                    {group.forLabel}
                  </td>
                  <td></td>
                </tr>
              );
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                  Noch keine Trainingspläne angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
