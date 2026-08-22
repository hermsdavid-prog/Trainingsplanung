import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO, formatDateLabel } from "@/lib/date";
import { HealthCheckinCard } from "@/components/health/health-checkin-card";
import { CheckinGate } from "@/components/health/checkin-gate";
import {
  computeHealthStatus,
  HEALTH_STATUS_LABEL,
  type HealthStatusLevel,
} from "@/lib/health-status";
import { computeExerciseTrends } from "@/lib/exercise-trend";
import { ExerciseTrendList } from "@/components/athletik/exercise-trend-list";
import { HealthChart } from "@/components/health/health-chart";

const LEVEL_TAG: Record<HealthStatusLevel, string> = {
  red: "tag-accent-2",
  yellow: "tag-accent",
  green: "tag-neutral",
  none: "tag-outline",
};

export default async function AthleteTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = todayISO();
  const date = dateParam || today;
  const rangeStart = shiftDateISO(today, -14);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plans }, { data: healthLog }, { data: recentLogs }, { data: exerciseResultRows }] =
    await Promise.all([
      supabase
        .from("training_plans")
        .select("id, title, category_label, scope_type, groups(name, color)")
        .eq("date", date)
        .order("scope_type"),
      date === today && user
        ? supabase
            .from("health_logs")
            .select("hrv, resting_hr, wellbeing")
            .eq("athlete_id", user.id)
            .eq("date", date)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("health_logs")
            .select("date, hrv, resting_hr, wellbeing")
            .eq("athlete_id", user.id)
            .gte("date", rangeStart)
            .order("date")
        : Promise.resolve({ data: [] }),
      user
        ? supabase
            .from("exercise_results")
            .select("exercise_id, date, value, unit, set_type, exercises(name)")
            .eq("athlete_id", user.id)
            .order("date")
        : Promise.resolve({ data: [] }),
    ]);

  const readiness = computeHealthStatus(recentLogs ?? [], today);
  const trends = computeExerciseTrends(
    (exerciseResultRows ?? [])
      .filter((r) => r.exercises?.name)
      .map((r) => ({
        exercise_id: r.exercise_id,
        exercise_name: r.exercises!.name,
        date: r.date,
        value: r.value,
        unit: r.unit,
        set_type: r.set_type,
      }))
  );

  const showCheckin = date === today && !healthLog;

  return (
    <div>
      <div className="kicker">{formatDateLabel(date)}</div>

      <CheckinGate
        showCheckin={showCheckin}
        checkin={
          <>
            <h2 className="mt-1.5 text-[27px] leading-[1.08]">Wie geht es dir heute?</h2>
            <p className="mt-2 text-[13px] leading-[1.55]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
              Einmal eintragen — danach zeigt die Startseite nur noch dein Training.
            </p>
            <div className="mt-[22px]">
              <HealthCheckinCard date={date} />
            </div>
          </>
        }
        main={
        <>
          <h2 className="mt-1.5 text-[27px] leading-[1.08]">Training heute</h2>

          <div className="mt-4">
            {(!plans || plans.length === 0) && (
              <div className="p-3.5 text-[13px] leading-[1.5]" style={{ background: "var(--dc-surface)", color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                Für heute ist kein Training geplant.
              </div>
            )}
            {(plans ?? []).map((plan) => (
              <Link key={plan.id} href={`/athlete/plans/${plan.id}`} className="block">
                <div
                  className="mb-2.5 p-3.5"
                  style={{
                    background: "var(--dc-surface)",
                    borderLeft: `2px solid ${plan.scope_type === "group" ? plan.groups?.color ?? "#4b3793" : "#4b3793"}`,
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="text-[17px] leading-[1.2]">{plan.title}</span>
                    <span className="tag tag-outline">{plan.category_label}</span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                    {plan.scope_type === "group"
                      ? `Gruppentraining · ${plan.groups?.name ?? ""}`
                      : "Einzeltraining für dich"}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Link href="/athlete/plans/new" className="btn btn-secondary btn-block">
            + Eigenes Workout erstellen
          </Link>

          <div className="kicker mt-7">Deine Werte · 14 Tage</div>
          <div className="mt-3">
            <HealthChart data={recentLogs ?? []} />
          </div>

          <div className="mt-6 p-3.5" style={{ background: "var(--dc-surface)" }}>
            <div className="flex items-center gap-2.5">
              <span className={`tag ${LEVEL_TAG[readiness.level]}`}>{HEALTH_STATUS_LABEL[readiness.level]}</span>
              <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                Trainingsbereitschaft
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-[1.5]">
              {readiness.today
                ? `Heute: Wohlbefinden ${readiness.today.wellbeing ?? "—"}${
                    readiness.today.hrv != null ? ` · HRV ${readiness.today.hrv}` : ""
                  }${readiness.today.resting_hr != null ? ` · Ruhe-HF ${readiness.today.resting_hr}` : ""}`
                : "Noch keine Eingabe für heute."}
            </p>
          </div>

          {trends.length > 0 && (
            <>
              <div className="kicker mt-7">Athletik-Fortschritt</div>
              <div className="mt-3">
                <ExerciseTrendList trends={trends.slice(0, 4)} href={(id) => `/athlete/athletik?exercise=${id}`} />
              </div>
              {trends.length > 4 && (
                <Link href="/athlete/athletik" className="btn btn-ghost mt-2">
                  Alle {trends.length} Übungen ansehen
                </Link>
              )}
            </>
          )}
        </>
        }
      />

      <div className="mt-6 flex items-center justify-between gap-3 p-2" style={{ background: "var(--dc-surface)" }}>
        <Link href={`/athlete?date=${shiftDateISO(date, -1)}`} className="btn btn-ghost" aria-label="Vorheriger Tag">
          ←
        </Link>
        <span className="text-sm">
          {date === today ? "Heute" : formatDateLabel(date)}
          {date !== today && (
            <>
              {" · "}
              <Link href="/athlete" className="underline">
                zu heute
              </Link>
            </>
          )}
        </span>
        <Link href={`/athlete?date=${shiftDateISO(date, 1)}`} className="btn btn-ghost" aria-label="Nächster Tag">
          →
        </Link>
      </div>
    </div>
  );
}
