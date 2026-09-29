import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AthletikProgress } from "@/components/athletik/athletik-progress";
import { formatDateShort } from "@/lib/date";

// A coach's own training log: every plan they trained along with via
// "Selbst trainieren" (finished or still open), plus their own Athletik
// progress. Private — exercise_results/session_ratings RLS only lets other
// trainers read rows of athletes in their groups, which a coach isn't.
export default async function TrainerOwnTrainingPage({
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

  const [{ data: ratings }, { data: resultRows }, { data: feedbackRows }] = await Promise.all([
    supabase.from("session_ratings").select("training_plan_id, rpe").eq("athlete_id", user.id),
    supabase.from("exercise_results").select("training_plan_id").eq("athlete_id", user.id).not("training_plan_id", "is", null),
    supabase.from("athlete_feedback").select("training_plan_items(training_plan_id)").eq("athlete_id", user.id),
  ]);

  const rpeByPlan = new Map((ratings ?? []).map((r) => [r.training_plan_id, r.rpe]));
  const planIds = new Set<string>(rpeByPlan.keys());
  for (const r of resultRows ?? []) if (r.training_plan_id) planIds.add(r.training_plan_id);
  for (const f of feedbackRows ?? []) if (f.training_plan_items?.training_plan_id) planIds.add(f.training_plan_items.training_plan_id);

  const { data: plans } = planIds.size
    ? await supabase
        .from("training_plans")
        .select("id, title, date, category_label, groups(name)")
        .in("id", [...planIds])
        .order("date", { ascending: false })
        .limit(30)
    : { data: [] };

  return (
    <div>
      <div className="kicker">Selbst trainiert</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Mein Training</h2>
      <p className="mt-2 text-sm text-muted">
        Trainings, die du selbst mitgemacht hast. Nur du siehst diese Einträge — sie fließen nicht in Gruppenstatistiken,
        Wochenbericht oder Export ein.
      </p>

      <div className="mt-7 max-w-[720px]">
        <div className="kicker-muted">Meine Einheiten</div>
        {(plans ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Noch nichts eingetragen. Öffne ein Training und tippe auf „Selbst trainieren“.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {(plans ?? []).map((p) => {
              const rpe = rpeByPlan.get(p.id);
              const isAthletik = p.category_label === "Athletik";
              return (
                <Link
                  key={p.id}
                  href={`/trainer/plans/${p.id}/session`}
                  className="flex items-center justify-between gap-3 p-3.5 no-underline"
                  style={{ background: "var(--dc-surface)", border: "1px solid var(--dc-divider)", color: "inherit" }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[16px]">{p.title}</span>
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--dc-muted)" }}>
                      {formatDateShort(p.date)} · {isAthletik ? "Athletik" : "Karate"}
                      {p.groups?.name ? ` · ${p.groups.name}` : ""}
                    </span>
                  </span>
                  <span className="flex-none text-[13px]">
                    {rpe != null ? (
                      <span className="tag tag-neutral">RPE {rpe} / 10</span>
                    ) : (
                      <span style={{ color: "var(--dc-accent-700)" }}>Fortsetzen →</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-9 max-w-[720px]">
        <AthletikProgress userId={user.id} exerciseParam={params.exercise} variant="section" />
      </div>
    </div>
  );
}
