import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO } from "@/lib/date";
import {
  computeHealthStatus,
  HEALTH_STATUS_LABEL,
  HEALTH_STATUS_DOT,
  HEALTH_STATUS_BORDER,
  type HealthLog,
  type HealthStatusLevel,
} from "@/lib/health-status";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LEVEL_ORDER: Record<HealthStatusLevel, number> = { red: 0, yellow: 1, none: 2, green: 3 };

export default async function TrainerDashboardPage() {
  const today = todayISO();
  const rangeStart = shiftDateISO(today, -30);

  const supabase = await createClient();

  const { data: groupAthleteRows } = await supabase
    .from("group_athletes")
    .select("athlete_id, profiles(full_name)");

  const athleteMap = new Map<string, string>();
  for (const row of groupAthleteRows ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries()).map(([id, full_name]) => ({
    id,
    full_name,
  }));

  const athleteIds = athletes.map((a) => a.id);
  const { data: logs } = athleteIds.length
    ? await supabase
        .from("health_logs")
        .select("athlete_id, date, hrv, resting_hr, wellbeing")
        .in("athlete_id", athleteIds)
        .gte("date", rangeStart)
        .order("date")
    : { data: [] };

  const logsByAthlete = new Map<string, HealthLog[]>();
  for (const log of logs ?? []) {
    logsByAthlete.set(log.athlete_id, [...(logsByAthlete.get(log.athlete_id) ?? []), log]);
  }

  const rows = athletes
    .map((athlete) => {
      const athleteLogs = logsByAthlete.get(athlete.id) ?? [];
      const { level, today: todayLog } = computeHealthStatus(athleteLogs, today);
      return { athlete, level, todayLog };
    })
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const redCount = rows.filter((r) => r.level === "red").length;
  const yellowCount = rows.filter((r) => r.level === "yellow").length;
  const checkedInCount = rows.filter((r) => r.todayLog).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trainingsbereitschaft</h1>
          <p className="text-sm text-muted-foreground">
            Wie fit sind deine Athleten heute — auf Basis von Wohlbefinden, HRV und
            Ruheherzfrequenz.
          </p>
        </div>
        <Link href="/trainer/health" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Verlaufskurven ansehen
        </Link>
      </div>

      {athletes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Athleten in deinen Gruppen.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-md border bg-background px-3 py-1.5">
              {checkedInCount} / {athletes.length} heute eingecheckt
            </span>
            {redCount > 0 && (
              <span className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">
                {redCount} deutliche Abweichung{redCount > 1 ? "en" : ""}
              </span>
            )}
            {yellowCount > 0 && (
              <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">
                {yellowCount} leichte Abweichung{yellowCount > 1 ? "en" : ""}
              </span>
            )}
          </div>

          <div className="flex flex-col divide-y rounded-md border">
            {rows.map(({ athlete, level, todayLog }) => (
              <div
                key={athlete.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 border-l-4 p-3",
                  HEALTH_STATUS_BORDER[level]
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", HEALTH_STATUS_DOT[level])} />
                  <span className="font-medium">{athlete.full_name}</span>
                  <Badge variant={level === "red" ? "destructive" : "secondary"}>
                    {HEALTH_STATUS_LABEL[level]}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {todayLog
                    ? `Heute: Wohlbefinden ${todayLog.wellbeing ?? "—"}${
                        todayLog.hrv != null ? ` · HRV ${todayLog.hrv}` : ""
                      }${todayLog.resting_hr != null ? ` · Ruhe-HF ${todayLog.resting_hr}` : ""}`
                    : "Noch keine Eingabe für heute"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
