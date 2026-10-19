import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO } from "@/lib/date";
import { computeHealthStatus, HEALTH_STATUS_LABEL, type HealthStatusLevel } from "@/lib/health-status";
import { HealthChart } from "@/components/health/health-chart";
import { PrivacyPolicyDialog } from "@/components/shell/privacy-policy-dialog";
import { HealthCheckinCard } from "@/components/health/health-checkin-card";

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

  const [{ data: logs }, { data: consentRow }] = await Promise.all([
    user
      ? supabase
          .from("health_logs")
          .select("date, hrv, resting_hr, wellbeing")
          .eq("athlete_id", user.id)
          .gte("date", rangeStart)
          .order("date")
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("athlete_consents").select("health_consent").eq("athlete_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const healthConsent = consentRow?.health_consent === true;

  const { level, today: todayLog } = computeHealthStatus(logs ?? [], today);

  return (
    <div>
      <div className="kicker">Bereitschaft und Verläufe</div>
      <h2 className="mt-2.5 text-[27px] leading-[1.08]">Gesundheit</h2>
      <p className="mt-2.5 text-[13px]" style={{ color: "var(--dc-muted)" }}>
        Dein Wohlbefinden, HRV und Ruheherzfrequenz der letzten 30 Tage.
      </p>

      <div className="mt-5 flex items-center gap-2.5">
        <span className={`tag ${LEVEL_TAG[level]}`}>{HEALTH_STATUS_LABEL[level]}</span>
        <span className="text-[13px]" style={{ color: "var(--dc-muted)" }}>
          {todayLog
            ? `Heute: Wohlbefinden ${todayLog.wellbeing ?? "—"}${
                todayLog.hrv != null ? ` · HRV ${Number(todayLog.hrv).toLocaleString("de-DE")}` : ""
              }${todayLog.resting_hr != null ? ` · Ruhe-HF ${Number(todayLog.resting_hr).toLocaleString("de-DE")}` : ""}`
            : "Noch keine Eingabe für heute"}
        </span>
      </div>

      {/* A skipped check-in can still be entered here later in the day. */}
      {healthConsent && !todayLog && (
        <div className="mt-6">
          <HealthCheckinCard date={today} />
        </div>
      )}
      {healthConsent && todayLog && (
        <details className="mt-4">
          <summary className="btn btn-secondary" style={{ listStyle: "none", cursor: "pointer" }}>
            Heute bearbeiten
          </summary>
          <div className="mt-4">
            <HealthCheckinCard
              date={today}
              initial={{ hrv: todayLog.hrv, restingHr: todayLog.resting_hr, wellbeing: todayLog.wellbeing }}
            />
          </div>
        </details>
      )}

      <div className="mt-6">
        {(logs?.length ?? 0) > 0 ? (
          <HealthChart data={logs ?? []} />
        ) : healthConsent ? (
          <p className="text-sm text-muted">Noch keine Gesundheitsdaten vorhanden. Trag sie oben oder auf der Startseite ein.</p>
        ) : (
          <p className="text-sm text-muted">
            Ohne Einwilligung für Gesundheitswerte werden keine Daten gespeichert.{" "}
            <Link href="/consent" className="underline">
              Einwilligung ändern
            </Link>
          </p>
        )}
      </div>

      <PrivacyPolicyDialog trigger="Datenschutzerklärung" triggerClassName="btn btn-ghost mt-6" />
    </div>
  );
}
