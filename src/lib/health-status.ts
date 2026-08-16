export type HealthLog = {
  date: string;
  hrv: number | null;
  resting_hr: number | null;
  wellbeing: number | null;
};

export type HealthStatusLevel = "green" | "yellow" | "red" | "none";

export const HEALTH_STATUS_LABEL: Record<HealthStatusLevel, string> = {
  green: "Unauffällig",
  yellow: "Leichte Abweichung",
  red: "Deutliche Abweichung",
  none: "Keine Daten",
};

export const HEALTH_STATUS_DOT: Record<HealthStatusLevel, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-muted-foreground/40",
};

export const HEALTH_STATUS_BORDER: Record<HealthStatusLevel, string> = {
  green: "border-l-emerald-500",
  yellow: "border-l-amber-500",
  red: "border-l-red-500",
  none: "border-l-border",
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Compares today's entry against the athlete's own rolling average of the
// previous entries (up to 7), flagging meaningful drops in wellbeing/HRV or
// spikes in resting heart rate as an early-warning "Ampel" for the coach.
export function computeHealthStatus(logs: HealthLog[], todayDate: string) {
  const today = logs.find((l) => l.date === todayDate) ?? null;
  const history = logs
    .filter((l) => l.date !== todayDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 7);

  if (!today || history.length < 3) {
    return { level: "none" as HealthStatusLevel, today, avg: null };
  }

  const avgWellbeing = mean(history.map((l) => l.wellbeing).filter((v): v is number => v != null));
  const avgHrv = mean(history.map((l) => l.hrv).filter((v): v is number => v != null));
  const avgRestingHr = mean(
    history.map((l) => l.resting_hr).filter((v): v is number => v != null)
  );

  const levels: HealthStatusLevel[] = [];

  if (avgWellbeing != null && today.wellbeing != null) {
    const diff = today.wellbeing - avgWellbeing;
    levels.push(diff <= -2 ? "red" : diff <= -1 ? "yellow" : "green");
  }
  if (avgHrv != null && today.hrv != null && avgHrv > 0) {
    const ratio = today.hrv / avgHrv;
    levels.push(ratio <= 0.85 ? "red" : ratio <= 0.92 ? "yellow" : "green");
  }
  if (avgRestingHr != null && today.resting_hr != null && avgRestingHr > 0) {
    const ratio = today.resting_hr / avgRestingHr;
    levels.push(ratio >= 1.15 ? "red" : ratio >= 1.08 ? "yellow" : "green");
  }

  if (levels.length === 0) {
    return { level: "none" as HealthStatusLevel, today, avg: null };
  }

  const level: HealthStatusLevel = levels.includes("red")
    ? "red"
    : levels.includes("yellow")
      ? "yellow"
      : "green";

  return {
    level,
    today,
    avg: { wellbeing: avgWellbeing, hrv: avgHrv, restingHr: avgRestingHr },
  };
}
