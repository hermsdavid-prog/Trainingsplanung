import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  currentMonthStr,
  formatMonthLabel,
  formatWeekLabel,
  getMonthGridDays,
  getWeekDays,
  shiftMonthStr,
  todayISO,
  utcISOToAppDateString,
} from "@/lib/date";
import { CalendarGrid, type CalendarItem } from "@/components/calendar/calendar-grid";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { CreateEventDialog } from "@/components/calendar/create-event-dialog";
import { WeekBoard, type WeekItem } from "@/components/calendar/week-board";

const INDIVIDUAL_PLAN_COLOR = "#4b3793";

export default async function TrainerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    group?: string;
    athlete?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;
  const month = params.month || currentMonthStr();
  const today = todayISO();
  const days = getMonthGridDays(month);
  const weekDays = getWeekDays(today);

  const rangeStart = days[0] < weekDays[0] ? days[0] : weekDays[0];
  const rangeEnd = days[days.length - 1] > weekDays[6] ? days[days.length - 1] : weekDays[6];

  const supabase = await createClient();

  const [{ data: groups }, { data: groupAthleteRows }] = await Promise.all([
    supabase.from("groups").select("id, name, color, short_name").order("name"),
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
  const groupLabel = new Map((groups ?? []).map((g) => [g.id, g.short_name || g.name]));

  const showPlans = params.type !== undefined ? params.type === "training" : true;
  const showEvents = params.type ? params.type !== "training" : true;
  const eventTypeFilter = params.type && params.type !== "training" ? params.type : null;

  let plansQuery = supabase
    .from("training_plans")
    .select("id, title, date, time, scope_type, group_id, athlete_id, groups(name, color)")
    .gte("date", rangeStart)
    .lte("date", rangeEnd);
  if (params.group) plansQuery = plansQuery.eq("group_id", params.group);
  if (params.athlete) plansQuery = plansQuery.eq("athlete_id", params.athlete);
  const { data: plans } = showPlans ? await plansQuery : { data: [] };

  let eventsQuery = supabase
    .from("events")
    .select("id, title, start_at, event_type, color, status, group_id, athlete_id, all_day")
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
  const weekItemsByDate: Record<string, WeekItem[]> = {};
  const weekDaySet = new Set(weekDays);

  for (const plan of plans ?? []) {
    const color =
      plan.scope_type === "group"
        ? groupColor.get(plan.group_id ?? "") ?? INDIVIDUAL_PLAN_COLOR
        : INDIVIDUAL_PLAN_COLOR;
    const who = plan.scope_type === "group" ? groupLabel.get(plan.group_id ?? "") ?? "Gruppe" : "Einzelplan";
    if (days.includes(plan.date)) {
      itemsByDate[plan.date] = [
        ...(itemsByDate[plan.date] ?? []),
        {
          id: plan.id,
          title: plan.title,
          color,
          href: `/trainer/plans/${plan.id}/edit`,
          subtitle: who,
          kind: "plan" as const,
        },
      ];
    }
    if (weekDaySet.has(plan.date)) {
      weekItemsByDate[plan.date] = [
        ...(weekItemsByDate[plan.date] ?? []),
        {
          id: plan.id,
          kind: "plan",
          title: plan.title,
          href: `/trainer/plans/${plan.id}/edit`,
          who,
          time: plan.time ?? "",
          tone: color,
          typeLabel: "Training",
        },
      ];
    }
  }

  for (const event of events ?? []) {
    const date = event.all_day ? event.start_at.slice(0, 10) : utcISOToAppDateString(event.start_at);
    const who = event.group_id
      ? groupLabel.get(event.group_id) ?? "Gruppe"
      : event.athlete_id
        ? athleteMap.get(event.athlete_id) ?? "Athlet"
        : "Alle";
    if (days.includes(date)) {
      itemsByDate[date] = [
        ...(itemsByDate[date] ?? []),
        {
          id: event.id,
          title: event.title,
          color: event.color,
          href: `/trainer/calendar?month=${date.slice(0, 7)}`,
          status: event.status,
          subtitle: event.event_type,
          kind: "event" as const,
        },
      ];
    }
    if (weekDaySet.has(date)) {
      const time = event.all_day
        ? "Ganztägig"
        : new Date(event.start_at).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Berlin",
          });
      weekItemsByDate[date] = [
        ...(weekItemsByDate[date] ?? []),
        {
          id: event.id,
          kind: "event",
          title: event.title,
          href: null,
          who,
          time,
          tone: event.color,
          typeLabel: event.event_type,
          status: event.status,
        },
      ];
    }
  }

  const activeParams = { group: params.group, athlete: params.athlete, type: params.type };

  function monthHref(targetMonth: string) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(activeParams)) {
      if (value) query.set(key, value);
    }
    query.set("month", targetMonth);
    return `/trainer/calendar?${query.toString()}`;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="kicker">{formatWeekLabel(today)}</div>
          <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Kalender</h2>
        </div>
        <CreateEventDialog defaultDate={today} groups={groups ?? []} athletes={athletes} />
      </div>

      <div className="mt-5 max-w-[420px]">
        <CalendarFilters groups={groups ?? []} athletes={athletes} eventTypes={eventTypes} />
      </div>

      <WeekBoard days={weekDays} itemsByDate={weekItemsByDate} />

      <div className="mt-9 max-w-[900px]">
        <div className="flex items-baseline justify-between gap-3">
          <Link href={monthHref(shiftMonthStr(month, -1))} className="btn btn-ghost" aria-label="Vorheriger Monat">
            ← Monat
          </Link>
          <span className="text-[24px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
            {formatMonthLabel(month)}
          </span>
          <Link href={monthHref(shiftMonthStr(month, 1))} className="btn btn-ghost" aria-label="Nächster Monat">
            Monat →
          </Link>
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.5]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
          Auf einen Tag klicken: alle Trainings und Termine dieses Tages ansehen und bei Bedarf ein
          neues Training anlegen. Einen Termin aus der Woche darauf ziehen oder mit „kopieren“
          auswählen und den Tag anklicken: der Termin wird kopiert.
        </p>

        <div className="mt-3">
          <CalendarGrid monthStr={month} days={days} itemsByDate={itemsByDate} todayStr={today} enableDragDrop />
        </div>
      </div>
    </div>
  );
}
