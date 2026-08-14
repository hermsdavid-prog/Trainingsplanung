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
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { CreateEventDialog } from "@/components/calendar/create-event-dialog";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const INDIVIDUAL_PLAN_COLOR = "#64748b";

export default async function TrainerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    date?: string;
    group?: string;
    athlete?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const month = params.month || currentMonthStr();
  const today = todayISO();
  const days = getMonthGridDays(month);
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  const supabase = await createClient();

  const [{ data: groups }, { data: groupAthleteRows }] = await Promise.all([
    supabase.from("groups").select("id, name, color").order("name"),
    supabase.from("group_athletes").select("athlete_id, profiles(full_name)"),
  ]);

  const athleteMap = new Map<string, string>();
  for (const row of groupAthleteRows ?? []) {
    if (row.profiles?.full_name) athleteMap.set(row.athlete_id, row.profiles.full_name);
  }
  const athletes = Array.from(athleteMap.entries()).map(([id, full_name]) => ({
    id,
    full_name,
  }));
  const groupColor = new Map((groups ?? []).map((g) => [g.id, g.color]));
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const showPlans = params.type !== undefined ? params.type === "training" : true;
  const showEvents = params.type ? params.type !== "training" : true;
  const eventTypeFilter = params.type && params.type !== "training" ? params.type : null;

  let plansQuery = supabase
    .from("training_plans")
    .select("id, title, date, status, scope_type, group_id, athlete_id, groups(name, color)")
    .gte("date", rangeStart)
    .lte("date", rangeEnd);
  if (params.group) plansQuery = plansQuery.eq("group_id", params.group);
  if (params.athlete) plansQuery = plansQuery.eq("athlete_id", params.athlete);
  const { data: plans } = showPlans ? await plansQuery : { data: [] };

  let eventsQuery = supabase
    .from("events")
    .select("id, title, start_at, event_type, color, status, group_id, athlete_id")
    .gte("start_at", `${rangeStart}T00:00:00Z`)
    .lte("start_at", `${rangeEnd}T23:59:59Z`);
  if (params.group) eventsQuery = eventsQuery.eq("group_id", params.group);
  if (params.athlete) eventsQuery = eventsQuery.eq("athlete_id", params.athlete);
  if (eventTypeFilter) eventsQuery = eventsQuery.eq("event_type", eventTypeFilter);
  const { data: events } = showEvents ? await eventsQuery : { data: [] };

  const { data: allEvents } = await supabase.from("events").select("event_type");
  const eventTypes = Array.from(
    new Set((allEvents ?? []).map((e) => e.event_type).filter(Boolean))
  ).sort();

  const itemsByDate: Record<string, CalendarItem[]> = {};

  for (const plan of plans ?? []) {
    const item = {
      id: plan.id,
      title: plan.title,
      color: plan.scope_type === "group" ? groupColor.get(plan.group_id ?? "") ?? INDIVIDUAL_PLAN_COLOR : INDIVIDUAL_PLAN_COLOR,
      href: `/trainer/plans/${plan.id}/edit`,
      status: plan.status,
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
      href: `/trainer/calendar?month=${month}&date=${date}`,
      status: event.status,
      subtitle: event.event_type,
      kind: "event" as const,
    };
    itemsByDate[date] = [...(itemsByDate[date] ?? []), item];
  }

  const selectedDate = params.date;
  const selectedItems = selectedDate ? itemsByDate[selectedDate] ?? [] : [];

  const activeParams = { group: params.group, athlete: params.athlete, type: params.type };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kalender</h1>
          <p className="text-sm text-muted-foreground">
            Trainings, Wettkämpfe und Termine im Überblick.
          </p>
        </div>
        <CreateEventDialog
          defaultDate={selectedDate || today}
          groups={groups ?? []}
          athletes={athletes}
        />
      </div>

      <CalendarFilters groups={groups ?? []} athletes={athletes} eventTypes={eventTypes} />

      <div className="flex items-center justify-between">
        <Link
          href={`/trainer/calendar?${new URLSearchParams({ ...activeParams, month: shiftMonthStr(month, -1) } as Record<string, string>).toString()}`}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <span className="text-sm font-medium capitalize">{formatMonthLabel(month)}</span>
        <Link
          href={`/trainer/calendar?${new URLSearchParams({ ...activeParams, month: shiftMonthStr(month, 1) } as Record<string, string>).toString()}`}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Nächster Monat"
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Tipp: Trainings und Termine lassen sich per Drag &amp; Drop verschieben (mit
        gedrückter Strg-Taste, Mac: Cmd, wird stattdessen eine Kopie angelegt). Auf dem
        Handy nutze dafür das ⋮-Menü bei einem Tag weiter unten.
      </p>

      <CalendarGrid
        baseHref="/trainer/calendar"
        monthStr={month}
        days={days}
        itemsByDate={itemsByDate}
        selectedDate={selectedDate}
        todayStr={today}
        activeParams={activeParams}
        enableDragDrop
      />

      {selectedDate && (
        <DayDetail date={selectedDate} items={selectedItems} canManage />
      )}
    </div>
  );
}
