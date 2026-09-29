"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateCompact } from "@/lib/date";

type Plan = { id: string; title: string; date: string };

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// A plain function prop can't cross the server/client boundary, so the link
// pattern is picked by role.
function planHref(role: "trainer" | "athlete", planId: string) {
  return role === "athlete" ? `/athlete/plans/${planId}` : `/trainer/plans/${planId}/edit`;
}

// The trainings assigned to one Mesozyklus. A training that repeats (weekly
// series, copies — anything with the same title) collapses into a single
// row: title, the weekday(s) and date span it covers, and how many dates;
// tapping it reveals the individual dates. One-off trainings stay a plain
// row. Newest first, like every other list.
export function MesocyclePlanList({ plans, role }: { plans: Plan[]; role: "trainer" | "athlete" }) {
  const [openTitle, setOpenTitle] = useState<string | null>(null);

  const groups = new Map<string, Plan[]>();
  for (const p of plans) {
    const list = groups.get(p.title) ?? [];
    list.push(p);
    groups.set(p.title, list);
  }
  const rows = [...groups.entries()]
    .map(([title, list]) => ({ title, list: [...list].sort((a, b) => (a.date < b.date ? 1 : -1)) }))
    .sort((a, b) => (a.list[0].date < b.list[0].date ? 1 : -1));

  return (
    <div className="flex flex-col gap-1">
      {rows.map(({ title, list }) => {
        if (list.length === 1) {
          const p = list[0];
          return (
            <Link
              key={p.id}
              href={planHref(role, p.id)}
              className="flex items-center justify-between gap-2 py-0.5 text-[13px] no-underline"
              style={{ color: "inherit" }}
            >
              <span className="truncate">{p.title}</span>
              <span className="flex-none text-muted">{formatDateCompact(p.date)}</span>
            </Link>
          );
        }

        const days = new Set(list.map((p) => weekdayOf(p.date)));
        const dayLabel =
          days.size === 1
            ? `jeden ${WEEKDAYS[[...days][0]]}`
            : WEEKDAY_ORDER.filter((d) => days.has(d))
                .map((d) => WEEKDAYS[d])
                .join(", ");
        const span = `${formatDateCompact(list[list.length - 1].date)}–${formatDateCompact(list[0].date)}`;
        const isOpen = openTitle === title;

        return (
          <div key={title}>
            <button
              type="button"
              onClick={() => setOpenTitle(isOpen ? null : title)}
              aria-expanded={isOpen}
              className="flex w-full items-start justify-between gap-2 py-0.5 text-left text-[13px]"
              style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}
            >
              <span className="min-w-0">
                <span className="block truncate">{title}</span>
                <span className="block text-xs text-muted">
                  {dayLabel} · {span}
                </span>
              </span>
              <span className="flex-none whitespace-nowrap" style={{ color: "var(--dc-accent-700)" }}>
                {list.length} Termine {isOpen ? "▴" : "▾"}
              </span>
            </button>
            {isOpen && (
              <div className="mt-1 mb-1.5 flex flex-wrap gap-1.5">
                {list.map((p) => (
                  <Link
                    key={p.id}
                    href={planHref(role, p.id)}
                    className="px-2 py-1 text-xs no-underline tabular-nums"
                    style={{ border: "1px solid var(--dc-divider)", background: "var(--dc-bg)", color: "inherit" }}
                  >
                    {WEEKDAYS[weekdayOf(p.date)]} {formatDateCompact(p.date)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
