import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeletePlanRowButton } from "@/components/plans/delete-plan-row-button";
import { formatDateShort } from "@/lib/date";
import { PLAN_TYPES, isValidPlanType } from "@/lib/plan-type";

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
        "id, title, category_label, date, time, scope_type, created_by, groups(name), profiles!training_plans_athlete_id_fkey(full_name)"
      )
      .eq("category_label", category)
      .order("date", { ascending: false })
      .limit(300),
    currentUser
      ? supabase.from("profiles").select("role").eq("id", currentUser.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const isKarate = category === "Sportartspezifisch";

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
            {(plans ?? []).map((plan) => {
              const canDelete =
                profile?.role === "admin" ||
                plan.created_by === currentUser?.id ||
                plan.scope_type === "group";
              return (
                <tr key={plan.id}>
                  <td style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>
                    {formatDateShort(plan.date)}
                  </td>
                  <td style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>
                    {plan.time || "—"}
                  </td>
                  <td className="text-[15px]">{plan.title}</td>
                  <td className="text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>
                    {plan.scope_type === "group"
                      ? (plan.groups?.name ?? "—")
                      : (plan.profiles?.full_name ?? "—")}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/trainer/plans/${plan.id}/edit`} className="btn btn-ghost">
                        bearbeiten
                      </Link>
                      {canDelete && <DeletePlanRowButton planId={plan.id} title={plan.title} />}
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!plans || plans.length === 0) && (
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
