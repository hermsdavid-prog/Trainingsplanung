"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { reschedulePlanAction, duplicatePlanToDateAction } from "@/lib/actions/plans";
import { rescheduleEventAction, duplicateEventToDateAction } from "@/lib/actions/events";

export type CalendarItem = {
  id: string;
  title: string;
  color: string;
  href: string;
  status?: string;
  subtitle?: string;
  kind: "plan" | "event";
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
  enableDragDrop = false,
}: {
  baseHref: string;
  monthStr: string;
  days: string[];
  itemsByDate: Record<string, CalendarItem[]>;
  selectedDate?: string;
  todayStr: string;
  activeParams: Record<string, string | undefined>;
  enableDragDrop?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [copyMode, setCopyMode] = useState(false);

  function goToDay(day: string) {
    router.push(buildHref(baseHref, { ...activeParams, month: monthStr, date: day }));
  }

  function handleDragStart(e: React.DragEvent, item: CalendarItem) {
    e.dataTransfer.setData("application/json", JSON.stringify({ id: item.id, kind: item.kind }));
    e.dataTransfer.effectAllowed = "copyMove";
  }

  function handleDrop(e: React.DragEvent, day: string) {
    e.preventDefault();
    const isCopy = e.ctrlKey || e.metaKey;
    setDragOverDate(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const { id, kind } = JSON.parse(raw) as { id: string; kind: "plan" | "event" };

    startTransition(async () => {
      const result = isCopy
        ? kind === "plan"
          ? await duplicatePlanToDateAction(id, day)
          : await duplicateEventToDateAction(id, day)
        : kind === "plan"
          ? await reschedulePlanAction(id, day)
          : await rescheduleEventAction(id, day);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isCopy ? "Termin kopiert." : "Termin verschoben.");
        router.refresh();
      }
    });
  }

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
          const isDragOver = day === dragOverDate;
          return (
            <div
              key={day}
              role="button"
              tabIndex={0}
              onClick={() => goToDay(day)}
              onKeyDown={(e) => e.key === "Enter" && goToDay(day)}
              onDragOver={
                enableDragDrop
                  ? (e) => {
                      e.preventDefault();
                      const isCopy = e.ctrlKey || e.metaKey;
                      e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
                      setDragOverDate(day);
                      setCopyMode(isCopy);
                    }
                  : undefined
              }
              onDragLeave={enableDragDrop ? () => setDragOverDate(null) : undefined}
              onDrop={enableDragDrop ? (e) => handleDrop(e, day) : undefined}
              className={cn(
                "flex min-h-20 cursor-pointer flex-col gap-1 border-t border-l p-1.5 text-left first:border-l-0 hover:bg-muted/40",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isSelected && "bg-accent",
                isDragOver &&
                  (copyMode
                    ? "bg-emerald-500/10 ring-2 ring-inset ring-emerald-500"
                    : "bg-primary/10 ring-2 ring-inset ring-primary")
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
              {isDragOver && (
                <span className="text-[0.6rem] font-medium text-emerald-600">
                  {copyMode ? "+ Kopie" : ""}
                </span>
              )}
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    draggable={enableDragDrop}
                    onDragStart={enableDragDrop ? (e) => handleDragStart(e, item) : undefined}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[0.65rem] text-white",
                      enableDragDrop && "cursor-grab active:cursor-grabbing"
                    )}
                    style={{ backgroundColor: item.color, opacity: item.status === "proposed" ? 0.6 : 1 }}
                    title={item.title}
                  >
                    {item.title}
                  </a>
                ))}
                {items.length > 3 && (
                  <span className="text-[0.65rem] text-muted-foreground">
                    +{items.length - 3} mehr
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
