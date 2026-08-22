import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO } from "@/lib/date";
import { computeHealthStatus, HEALTH_STATUS_LABEL, type HealthStatusLevel } from "@/lib/health-status";
import { HealthChart } from "@/components/health/health-chart";
import { PrivacyPolicyDialog } from "@/components/shell/privacy-policy-dialog";

const LEVEL_TAG: Record<HealthStatusLevel, string> = {
  red: "tag-accent-2",
  yellow: "tag-accent",
  green: "tag-neutral",
  none: "tag-outline",
};

export default async function AthleteHealthPage() {
  const today = todayISO();
  const rangeStart = shiftDateISO(today, -30);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: logs } = user
    ? await supabase
        .from("health_logs")
        .select("date, hrv, resting_hr, wellbeing")
        .eq("athlete_id", user.id)
        .gte("date", rangeStart)
        .order("date")
    : { data: [] };

  const { level, today: todayLog } = computeHealthStatus(logs ?? [], today);

  return (
    <div>
      <div className="kicker">Bereitschaft und Verläufe</div>
      <h2 className="mt-2.5 text-[27px] leading-[1.08]">Gesundheit</h2>
      <p className="mt-2.5 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
        Dein Wohlbefinden, HRV und Ruheherzfrequenz der letzten 30 Tage.
      </p>

      <div className="mt-5 flex items-center gap-2.5">
        <span className={`tag ${LEVEL_TAG[level]}`}>{HEALTH_STATUS_LABEL[level]}</span>
        <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
          {todayLog
            ? `Heute: Wohlbefinden ${todayLog.wellbeing ?? "—"}${
                todayLog.hrv != null ? ` · HRV ${todayLog.hrv}` : ""
              }${todayLog.resting_hr != null ? ` · Ruhe-HF ${todayLog.resting_hr}` : ""}`
            : "Noch keine Eingabe für heute"}
        </span>
      </div>

      <div className="mt-6">
        {(logs?.length ?? 0) > 0 ? (
          <HealthChart data={logs ?? []} />
        ) : (
          <p className="text-sm text-muted">Noch keine Gesundheitsdaten vorhanden — trag sie auf der Startseite ein.</p>
        )}
      </div>

      <PrivacyPolicyDialog trigger="Datenschutzerklärung" triggerClassName="btn btn-ghost mt-6" />
    </div>
  );
}
