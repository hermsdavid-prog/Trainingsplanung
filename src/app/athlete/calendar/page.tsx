import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  currentMonthStr,
  formatMonthLabel,
  getMonthGridDays,
  shiftMonthStr,
  todayISO,
} from "@/lib/date";
import { CalendarGrid, type CalendarItem } from "@/components/calendar/calendar-grid";
import { DayDetail } from "@/components/calendar/day-detail";
import { ProposeEventDialog } from "@/components/calendar/propose-event-dialog";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const INDIVIDUAL_PLAN_COLOR = "#64748b";

export default async function AthleteCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const params = await searchParams;
  const month = params.month || currentMonthStr();
  const today = todayISO();
  const days = getMonthGridDays(month);
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  const supabase = await createClient();

  const { data: myGroups } = await supabase
    .from("group_athletes")
    .select("groups(id, name, color)");
  const groups = (myGroups ?? [])
    .map((row) => row.groups)
    .filter((g): g is { id: string; name: string; color: string } => !!g);
  const groupColor = new Map(groups.map((g) => [g.id, g.color]));
  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  const [{ data: plans }, { data: events }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, title, date, scope_type, group_id")
      .gte("date", rangeStart)
      .lte("date", rangeEnd),
    supabase
      .from("events")
      .select("id, title, start_at, event_type, color, status, group_id, athlete_id")
      .gte("start_at", `${rangeStart}T00:00:00Z`)
      .lte("start_at", `${rangeEnd}T23:59:59Z`),
  ]);

  const itemsByDate: Record<string, (CalendarItem & { subtitle?: string; kind: "plan" | "event" })[]> = {};

  for (const plan of plans ?? []) {
    const item = {
      id: plan.id,
      title: plan.title,
      color:
        plan.scope_type === "group"
          ? groupColor.get(plan.group_id ?? "") ?? INDIVIDUAL_PLAN_COLOR
          : INDIVIDUAL_PLAN_COLOR,
      href: `/athlete/plans/${plan.id}`,
      subtitle: plan.scope_type === "group" ? groupName.get(plan.group_id ?? "") : "Einzelplan",
      kind: "plan" as const,
    };
    itemsByDate[plan.date] = [...(itemsByDate[plan.date] ?? []), item];
  }

  for (const event of events ?? []) {
    const date = event.start_at.slice(0, 10);
    const item = {
      id: event.id,
      title: event.title,
      color: event.color,
      href: `/athlete/calendar?month=${month}&date=${date}`,
      status: event.status,
      subtitle: event.event_type,
      kind: "event" as const,
    };
    itemsByDate[date] = [...(itemsByDate[date] ?? []), item];
  }

  const selectedDate = params.date;
  const selectedItems = selectedDate ? itemsByDate[selectedDate] ?? [] : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kalender</h1>
          <p className="text-sm text-muted-foreground">
            Deine Trainings und Termine im Überblick.
          </p>
        </div>
        <ProposeEventDialog defaultDate={selectedDate || today} groups={groups} />
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/athlete/calendar?month=${shiftMonthStr(month, -1)}`}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <span className="text-sm font-medium capitalize">{formatMonthLabel(month)}</span>
        <Link
          href={`/athlete/calendar?month=${shiftMonthStr(month, 1)}`}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Nächster Monat"
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      <CalendarGrid
        baseHref="/athlete/calendar"
        monthStr={month}
        days={days}
        itemsByDate={itemsByDate}
        selectedDate={selectedDate}
        todayStr={today}
        activeParams={{}}
      />

      {selectedDate && <DayDetail date={selectedDate} items={selectedItems} />}
    </div>
  );
}
