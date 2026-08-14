import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { todayISO, shiftDateISO, formatDateLabel } from "@/lib/date";
import { HealthCheckinCard } from "@/components/health/health-checkin-card";

export default async function AthleteTodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const today = todayISO();
  const date = dateParam || today;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: plans }, { data: healthLog }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, title, category_label, scope_type, groups(name)")
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
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Training</h1>
        <p className="text-sm text-muted-foreground">
          Deine Gruppen- und Einzelpläne für den ausgewählten Tag.
        </p>
      </div>

      {date === today && (
        <HealthCheckinCard
          date={date}
          initial={
            healthLog
              ? {
                  hrv: healthLog.hrv,
                  restingHr: healthLog.resting_hr,
                  wellbeing: healthLog.wellbeing,
                }
              : null
          }
        />
      )}

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
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  {plan.category_label && (
                    <Badge variant="secondary">{plan.category_label}</Badge>
                  )}
                </div>
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
