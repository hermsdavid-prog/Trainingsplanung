import { createClient } from "@/lib/supabase/server";
import { formatDateShort, shiftDateISO, todayISO } from "@/lib/date";
import { defaultMvt, estimateOneRmFromProfile, fitLoadVelocity, velocityAt, velocityLoss } from "@/lib/vbt";
import { VbtProfileChart } from "@/components/athletik/vbt-profile-chart";
import { VbtMvtInput } from "@/components/athletik/vbt-mvt-input";

const WINDOW_DAYS = 56;
const fmt = (n: number, digits = 2) => n.toFixed(digits).replace(".", ",");
const kg = (n: number) => fmt(n, 1).replace(",0", "");

// Load-velocity profile of one athlete and exercise (VBT): the current
// profile from the last eight weeks, the 1RM it estimates at the MVT, and
// the same numbers for the eight weeks before, so progress shows without a
// max test. Renders nothing for exercises without logged bar speed.
export async function VbtProfile({
  athleteId,
  exerciseId,
  exerciseName,
  mvtParam,
}: {
  athleteId: string;
  exerciseId: string;
  exerciseName: string;
  mvtParam?: string;
}) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("exercise_results")
    .select("date, value, unit, set_type, velocity, velocity_last")
    .eq("athlete_id", athleteId)
    .eq("exercise_id", exerciseId)
    .not("velocity", "is", null)
    .order("date", { ascending: false })
    .limit(500);
  if (!rows || rows.length === 0) return null;

  const parsedMvt = Number((mvtParam ?? "").replace(",", "."));
  const mvt = Number.isFinite(parsedMvt) && parsedMvt > 0 && parsedMvt < 2 ? parsedMvt : defaultMvt(exerciseName);
  const unit = rows.find((r) => r.unit)?.unit ?? "kg";
  const today = todayISO();
  const recentFrom = shiftDateISO(today, -WINDOW_DAYS);
  const previousFrom = shiftDateISO(today, -2 * WINDOW_DAYS);
  const point = (r: (typeof rows)[number]) => ({ load: Number(r.value), velocity: Number(r.velocity) });
  const recent = rows.filter((r) => r.date >= recentFrom).map(point);
  const previous = rows.filter((r) => r.date >= previousFrom && r.date < recentFrom).map(point);
  const older = rows.filter((r) => r.date < recentFrom).map(point);

  const fit = fitLoadVelocity(recent);
  const previousFit = fitLoadVelocity(previous);
  const oneRm = fit ? estimateOneRmFromProfile(fit, mvt) : null;
  const previousOneRm = previousFit ? estimateOneRmFromProfile(previousFit, mvt) : null;
  const minLoad = recent.length ? Math.min(...recent.map((p) => p.load)) : 0;
  const line = fit && oneRm ? [{ load: minLoad, velocity: velocityAt(fit, minLoad) }, { load: oneRm, velocity: mvt }] : [];

  const stat = (value: string, label: string) => (
    <div className="flex items-baseline gap-2">
      <span className="text-[22px] leading-none font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
        {value}
      </span>
      <span className="text-sm" style={{ color: "var(--dc-muted)" }}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="mt-8">
      <div className="kicker-muted">Last-Geschwindigkeits-Profil (VBT)</div>
      <p className="mt-1.5 text-xs" style={{ color: "var(--dc-muted)" }}>
        Jeder Punkt ist ein Satz mit gemessener Hantelgeschwindigkeit (schnellste Wiederholung). Die Gerade beschreibt die
        letzten 8 Wochen; wo sie die Geschwindigkeit bei 1RM (MVT) erreicht, liegt das geschätzte 1RM.
      </p>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {oneRm != null && stat(`${kg(oneRm)} ${unit}`, "geschätztes 1RM")}
        {oneRm != null && previousOneRm != null && (
          <span className="text-sm" style={{ color: oneRm >= previousOneRm ? "#0f8a5f" : "#b45309" }}>
            {oneRm >= previousOneRm ? "+" : ""}
            {kg(oneRm - previousOneRm)} {unit} gegenüber den 8 Wochen davor ({kg(previousOneRm)} {unit})
          </span>
        )}
      </div>
      {fit ? (
        <p className="mt-1.5 text-xs" style={{ color: "var(--dc-muted)" }}>
          {fit.n} Sätze mit {fit.loads} verschiedenen Lasten · Bestimmtheitsmaß R² {fmt(fit.r2)}
          {fit.r2 < 0.8 ? " (streut stark, Werte mit Vorsicht nutzen)" : ""}
        </p>
      ) : (
        <p className="mt-1.5 text-xs" style={{ color: "var(--dc-muted)" }}>
          Für ein Profil braucht es in den letzten 8 Wochen mindestens 3 Sätze mit 2 verschiedenen Lasten.
        </p>
      )}
      <div className="mt-2">
        <VbtMvtInput value={mvt} />
      </div>

      <div className="mt-3">
        <VbtProfileChart recent={recent} older={older.slice(0, 200)} line={line} unit={unit} />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Last</th>
              <th>m/s</th>
              <th>Verlust</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 30).map((r, i) => {
              const loss = velocityLoss(Number(r.velocity), r.velocity_last != null ? Number(r.velocity_last) : null);
              return (
                <tr key={i}>
                  <td>
                    {formatDateShort(r.date)}
                    {r.set_type === "aufwaermsatz" ? <span style={{ color: "var(--dc-muted)" }}> · Aufwärmen</span> : null}
                  </td>
                  <td>
                    {kg(Number(r.value))} {unit}
                  </td>
                  <td>{fmt(Number(r.velocity))}</td>
                  <td style={{ color: "var(--dc-muted)" }}>{loss != null ? `${String(loss).replace(".", ",")} %` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
