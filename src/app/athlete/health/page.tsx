import { createClient } from "@/lib/supabase/server";
import { todayISO, shiftDateISO } from "@/lib/date";
import {
  computeHealthStatus,
  HEALTH_STATUS_LABEL,
  HEALTH_STATUS_DOT,
} from "@/lib/health-status";
import { HealthChart } from "@/components/health/health-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Gesundheit</h1>
        <p className="text-sm text-muted-foreground">
          Dein Wohlbefinden, HRV und Ruheherzfrequenz der letzten 30 Tage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("size-2.5 rounded-full", HEALTH_STATUS_DOT[level])} />
            <CardTitle className="text-base">Trainingsbereitschaft</CardTitle>
            <Badge variant={level === "red" ? "destructive" : "secondary"}>
              {HEALTH_STATUS_LABEL[level]}
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
          {(logs?.length ?? 0) > 0 ? (
            <HealthChart data={logs ?? []} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch keine Gesundheitsdaten vorhanden — trag sie auf der Startseite ein.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
