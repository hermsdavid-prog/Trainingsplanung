import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  currentMonthStr,
  formatMonthLabel,
  getMonthGridDays,
  getWeekDays,
  shiftMonthStr,
  todayISO,
  utcISOToAppDateString,
} from "@/lib/date";
import { CalendarGrid, type CalendarItem } from "@/components/calendar/calendar-grid";
import { ProposeEventDialog } from "@/components/calendar/propose-event-dialog";

const INDIVIDUAL_PLAN_COLOR = "#4b3793";

type AgendaItem = {
  id: string;
  title: string;
  href: string;
  time: string;
  meta: string;
  tone: string;
};

export default async function AthleteCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month || currentMonthStr();
  const today = todayISO();
  const days = getMonthGridDays(month);
  const weekDays = getWeekDays(today);
  const weekDaySet = new Set(weekDays);

  const rangeStart = days[0] < weekDays[0] ? days[0] : weekDays[0];
  const rangeEnd = days[days.length - 1] > weekDays[6] ? days[days.length - 1] : weekDays[6];

  const supabase = await createClient();

  const { data: myGroups } = await supabase
    .from("group_athletes")
    .select("groups(id, name, color, short_name)");
  const groups = (myGroups ?? [])
    .map((row) => row.groups)
    .filter((g): g is { id: string; name: string; color: string; short_name: string | null } => !!g);
  const groupColor = new Map(groups.map((g) => [g.id, g.color]));
  const groupLabel = new Map(groups.map((g) => [g.id, g.short_name || g.name]));

  const [{ data: plans }, { data: events }] = await Promise.all([
    supabase
      .from("training_plans")
      .select("id, title, date, time, scope_type, group_id")
      .gte("date", rangeStart)
      .lte("date", rangeEnd),
    supabase
      .from("events")
      .select("id, title, description, start_at, event_type, color, status, group_id, athlete_id, all_day")
      .gte("start_at", `${rangeStart}T00:00:00Z`)
      .lte("start_at", `${rangeEnd}T23:59:59Z`),
  ]);

  const itemsByDate: Record<string, CalendarItem[]> = {};
  const agendaByDate: Record<string, AgendaItem[]> = {};

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
          href: `/athlete/plans/${plan.id}`,
          subtitle: who,
          kind: "plan" as const,
        },
      ];
    }
    if (weekDaySet.has(plan.date)) {
      agendaByDate[plan.date] = [
        ...(agendaByDate[plan.date] ?? []),
        {
          id: plan.id,
          title: plan.title,
          href: `/athlete/plans/${plan.id}`,
          time: plan.time ?? "",
          meta: who,
          tone: color,
        },
      ];
    }
  }

  for (const event of events ?? []) {
    const date = event.all_day ? event.start_at.slice(0, 10) : utcISOToAppDateString(event.start_at);
    if (days.includes(date)) {
      itemsByDate[date] = [
        ...(itemsByDate[date] ?? []),
        {
          id: event.id,
          title: event.title,
          color: event.color,
          href: `/athlete/calendar?month=${date.slice(0, 7)}`,
          status: event.status,
          subtitle: event.event_type,
          description: event.description,
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
      agendaByDate[date] = [
        ...(agendaByDate[date] ?? []),
        {
          id: event.id,
          title: event.title,
          href: `/athlete/calendar?month=${date.slice(0, 7)}`,
          time,
          meta: event.event_type,
          tone: event.color,
        },
      ];
    }
  }

  const myAgenda = weekDays.flatMap((day) => agendaByDate[day] ?? []);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[27px] leading-[1.08]">Kalender</h2>
        <ProposeEventDialog defaultDate={today} groups={groups} />
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <Link href={`/athlete/calendar?month=${shiftMonthStr(month, -1)}`} className="btn btn-ghost" aria-label="Vorheriger Monat">
          ← Monat
        </Link>
        <span className="text-[18px] font-semibold" style={{ fontFamily: "var(--dc-font-heading)" }}>
          {formatMonthLabel(month)}
        </span>
        <Link href={`/athlete/calendar?month=${shiftMonthStr(month, 1)}`} className="btn btn-ghost" aria-label="Nächster Monat">
          Monat →
        </Link>
      </div>

      <div className="mt-3">
        <CalendarGrid monthStr={month} days={days} itemsByDate={itemsByDate} todayStr={today} />
      </div>

      <div className="kicker mt-6.5">Diese Woche</div>
      <div className="mt-3">
        {myAgenda.length === 0 && <p className="text-sm text-muted">Keine Einträge diese Woche.</p>}
        {myAgenda.map((item) => (
          <Link key={item.id} href={item.href} className="exrow block" style={{ padding: 0 }}>
            <div className="mb-2.5 w-full p-3.5" style={{ background: "var(--dc-surface)", borderLeft: `2px solid ${item.tone}` }}>
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="text-[17px] leading-[1.2]">{item.title}</span>
                <span className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                  {item.time}
                </span>
              </div>
              <div className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                {item.meta}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
