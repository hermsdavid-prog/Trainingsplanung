import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO } from "@/lib/date";
import { computeHealthStatus, type HealthLog } from "@/lib/health-status";
import { HealthChart } from "@/components/health/health-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  green: "Unauffällig",
  yellow: "Leichte Abweichung",
  red: "Deutliche Abweichung",
  none: "Keine Daten",
};

const STATUS_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  none: "bg-muted-foreground/40",
};

export default async function TrainerHealthPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Gesundheitsübersicht</h1>
        <p className="text-sm text-muted-foreground">
          Wohlbefinden, HRV und Ruheherzfrequenz der letzten 30 Tage je Athlet, mit
          automatischer Abweichungserkennung gegenüber dem eigenen Mittelwert.
        </p>
      </div>

      {athletes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Noch keine Athleten in deinen Gruppen.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {athletes.map((athlete) => {
          const athleteLogs = logsByAthlete.get(athlete.id) ?? [];
          const { level, today: todayLog } = computeHealthStatus(athleteLogs, today);
          return (
            <Card key={athlete.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", STATUS_DOT[level])} />
                  <CardTitle className="text-base">{athlete.full_name}</CardTitle>
                  <Badge variant={level === "red" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[level]}
                  </Badge>
                  {todayLog && (
                    <span className="text-xs text-muted-foreground">
                      Heute: Wohlbefinden {todayLog.wellbeing ?? "—"}
                      {todayLog.hrv != null && ` · HRV ${todayLog.hrv}`}
                      {todayLog.resting_hr != null && ` · Ruhe-HF ${todayLog.resting_hr}`}
                    </span>
                  )}
                  {!todayLog && (
                    <span className="text-xs text-muted-foreground">
                      Noch keine Eingabe für heute
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {athleteLogs.length > 0 ? (
                  <HealthChart data={athleteLogs} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Noch keine Gesundheitsdaten vorhanden.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
