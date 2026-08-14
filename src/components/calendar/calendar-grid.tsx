import Link from "next/link";
import { cn } from "@/lib/utils";

export type CalendarItem = {
  id: string;
  title: string;
  color: string;
  href: string;
  status?: string;
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function buildHref(base: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

export function CalendarGrid({
  baseHref,
  monthStr,
  days,
  itemsByDate,
  selectedDate,
  todayStr,
  activeParams,
}: {
  baseHref: string;
  monthStr: string;
  days: string[];
  itemsByDate: Record<string, CalendarItem[]>;
  selectedDate?: string;
  todayStr: string;
  activeParams: Record<string, string | undefined>;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-7 bg-muted/50 text-xs font-medium text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="p-2 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = day.slice(0, 7) === monthStr;
          const items = itemsByDate[day] ?? [];
          const isToday = day === todayStr;
          const isSelected = day === selectedDate;
          return (
            <Link
              key={day}
              href={buildHref(baseHref, { ...activeParams, month: monthStr, date: day })}
              className={cn(
                "flex min-h-20 flex-col gap-1 border-t border-l p-1.5 text-left first:border-l-0 hover:bg-muted/40",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isSelected && "bg-accent"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary text-primary-foreground"
                )}
              >
                {Number(day.slice(8, 10))}
              </span>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className="truncate rounded px-1 py-0.5 text-[0.65rem] text-white"
                    style={{ backgroundColor: item.color, opacity: item.status === "proposed" ? 0.6 : 1 }}
                    title={item.title}
                  >
                    {item.title}
                  </span>
                ))}
                {items.length > 3 && (
                  <span className="text-[0.65rem] text-muted-foreground">
                    +{items.length - 3} mehr
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
