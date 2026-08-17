import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { todayISO, shiftDateISO, formatDateLabel } from "@/lib/date";
import { HealthCheckinCard } from "@/components/health/health-checkin-card";
import {
  computeHealthStatus,
  HEALTH_STATUS_LABEL,
  HEALTH_STATUS_DOT,
  HEALTH_STATUS_BORDER,
} from "@/lib/health-status";
import { computeExerciseTrends } from "@/lib/exercise-trend";
import { ExerciseTrendList } from "@/components/athletik/exercise-trend-list";
import { cn } from "@/lib/utils";

const INDIVIDUAL_PLAN_COLOR = "#4b3793";

export default async function AthleteTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = todayISO();
  const date = dateParam || today;
  const rangeStart = shiftDateISO(today, -30);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Training</h1>
          <p className="text-sm text-muted-foreground">
            Deine Gruppen- und Einzelpläne für den ausgewählten Tag.
          </p>
        </div>
        <Link href="/athlete/plans/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <PlusIcon /> Neues Training
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={cn("border-l-4", HEALTH_STATUS_BORDER[readiness.level])}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", HEALTH_STATUS_DOT[readiness.level])} />
              <CardTitle className="text-base">Trainingsbereitschaft</CardTitle>
              <Badge variant={readiness.level === "red" ? "destructive" : "secondary"}>
                {HEALTH_STATUS_LABEL[readiness.level]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {readiness.today
                ? `Heute: Wohlbefinden ${readiness.today.wellbeing ?? "—"}${
                    readiness.today.hrv != null ? ` · HRV ${readiness.today.hrv}` : ""
                  }${
                    readiness.today.resting_hr != null
                      ? ` · Ruhe-HF ${readiness.today.resting_hr}`
                      : ""
                  }`
                : "Noch keine Eingabe für heute — trag unten deine Werte ein."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-brand">
          <CardHeader>
            <CardTitle className="text-base">Athletik-Fortschritt</CardTitle>
          </CardHeader>
          <CardContent>
            <ExerciseTrendList
              trends={trends.slice(0, 4)}
              href={(exerciseId) => `/athlete/athletik?exercise=${exerciseId}`}
            />
            {trends.length > 4 && (
              <Link
                href="/athlete/athletik"
                className="mt-2 inline-block text-xs text-muted-foreground hover:underline"
              >
                Alle {trends.length} Übungen ansehen
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {date === today && !healthLog && <HealthCheckinCard date={date} />}

      <div className="flex items-center justify-between rounded-md border bg-background p-2">
        <Link
          href={`/athlete?date=${shiftDateISO(date, -1)}`}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Vorheriger Tag"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium capitalize">{formatDateLabel(date)}</span>
          {date !== today && (
            <Link href="/athlete" className="text-xs text-muted-foreground hover:underline">
              Zurück zu heute
            </Link>
          )}
        </div>
        <Link
          href={`/athlete?date=${shiftDateISO(date, 1)}`}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Nächster Tag"
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      {(!plans || plans.length === 0) && (
        <p className="text-sm text-muted-foreground">
          Für diesen Tag ist kein Training eingetragen.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(plans ?? []).map((plan) => (
          <Link key={plan.id} href={`/athlete/plans/${plan.id}`}>
            <Card
              className="border-l-4 transition-colors hover:bg-muted/50"
              style={{
                borderLeftColor:
                  plan.scope_type === "group"
                    ? plan.groups?.color ?? INDIVIDUAL_PLAN_COLOR
                    : INDIVIDUAL_PLAN_COLOR,
              }}
            >
              <CardHeader>
                <CardTitle className="text-base">{plan.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {plan.scope_type === "group"
                    ? `Gruppentraining · ${plan.groups?.name ?? ""}`
                    : "Einzeltraining für dich"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
