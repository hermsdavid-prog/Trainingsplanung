"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateLabel, formatDateShort } from "@/lib/date";
import { reschedulePlanAction, duplicatePlanToDateAction } from "@/lib/actions/plans";
import { rescheduleEventAction, duplicateEventToDateAction } from "@/lib/actions/events";
import { getBerlinCalendarMark } from "@/lib/berlin-holidays";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";

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

function subscribeNoop() {
  return () => {};
}
function getCoarsePointerSnapshot() {
  return window.matchMedia("(pointer: coarse)").matches;
}
function getCoarsePointerServerSnapshot() {
  return false;
}

export function CalendarGrid({
  monthStr,
  days,
  itemsByDate,
  todayStr,
  enableDragDrop = false,
}: {
  monthStr: string;
  days: string[];
  itemsByDate: Record<string, CalendarItem[]>;
  todayStr: string;
  enableDragDrop?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [copyMode, setCopyMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreatePicker, setShowCreatePicker] = useState(false);
  // Native HTML5 drag-and-drop doesn't reliably support touch, so on touch
  // devices dropping onto month cells is disabled — dragging can only start
  // from the weekly board's cards, and only with a mouse.
  const isCoarsePointer = useSyncExternalStore(
    subscribeNoop,
    getCoarsePointerSnapshot,
    getCoarsePointerServerSnapshot
  );
  const dragDropActive = enableDragDrop && !isCoarsePointer;
  const selectedItems = selectedDate ? (itemsByDate[selectedDate] ?? []) : [];

  function openDay(day: string) {
    setSelectedDate(day);
    setShowCreatePicker(false);
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setSelectedDate(null);
      setShowCreatePicker(false);
    }
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
    <div>
      <div
        className="grid gap-1.5 text-[10px] uppercase"
        style={{
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          letterSpacing: "0.08em",
          color: "color-mix(in srgb, var(--dc-text) 50%, transparent)",
        }}
      >
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-1.5 grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {days.map((day) => {
          const inMonth = day.slice(0, 7) === monthStr;
          const items = itemsByDate[day] ?? [];
          const isToday = day === todayStr;
          const isDragOver = day === dragOverDate;
          const border = isDragOver
            ? copyMode
              ? "var(--dc-accent-2)"
              : "var(--dc-accent)"
            : "var(--dc-divider)";
          const berlinMark = getBerlinCalendarMark(day);
          const bg = isDragOver
            ? copyMode
              ? "color-mix(in srgb, var(--dc-accent-2) 8%, transparent)"
              : "color-mix(in srgb, var(--dc-accent) 8%, transparent)"
            : berlinMark?.type === "feiertag" && inMonth
              ? "color-mix(in srgb, var(--dc-accent-2) 6%, var(--dc-surface))"
              : berlinMark?.type === "ferien" && inMonth
                ? "color-mix(in srgb, var(--dc-neutral-400) 12%, var(--dc-surface))"
                : inMonth
                  ? "var(--dc-surface)"
                  : "transparent";
          const fg = inMonth ? "var(--dc-text)" : "color-mix(in srgb, var(--dc-text) 40%, transparent)";
          const mark = items[0]?.color ?? "transparent";

          return (
            <button
              key={day}
              type="button"
              onClick={() => openDay(day)}
              onDragOver={
                dragDropActive
                  ? (e) => {
                      e.preventDefault();
                      const isCopy = e.ctrlKey || e.metaKey;
                      e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
                      setDragOverDate(day);
                      setCopyMode(isCopy);
                    }
                  : undefined
              }
              onDragLeave={dragDropActive ? () => setDragOverDate(null) : undefined}
              onDrop={dragDropActive ? (e) => handleDrop(e, day) : undefined}
              className="flex flex-col gap-0.5 text-left"
              style={{
                minWidth: 0,
                minHeight: 92,
                padding: 5,
                fontFamily: "var(--dc-font-body)",
                cursor: "pointer",
                background: bg,
                border: `1px solid ${border}`,
                color: fg,
              }}
              title={berlinMark ? berlinMark.label : undefined}
            >
              <span className="flex w-full items-baseline justify-between gap-1">
                <span className="text-xs">{Number(day.slice(8, 10))}</span>
                {isToday && (
                  <span
                    className="text-[8px] uppercase"
                    style={{ letterSpacing: "0.06em", color: "var(--dc-accent)" }}
                  >
                    Heute
                  </span>
                )}
              </span>
              {berlinMark && (
                <span
                  className="truncate text-[9px] leading-tight"
                  style={{
                    color:
                      berlinMark.type === "feiertag"
                        ? "var(--dc-accent-2-700)"
                        : "color-mix(in srgb, var(--dc-text) 55%, transparent)",
                  }}
                >
                  {berlinMark.label}
                </span>
              )}
              <span className="flex w-full flex-col gap-0.5">
                {items.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className="truncate text-[10px] leading-tight"
                    style={{ color: item.color }}
                    title={item.subtitle ? `${item.title} · ${item.subtitle}` : item.title}
                  >
                    {item.title}
                  </span>
                ))}
                {items.length > 3 && (
                  <span
                    className="text-[9px]"
                    style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}
                  >
                    +{items.length - 3} mehr
                  </span>
                )}
              </span>
              <span className="mt-auto" style={{ height: 3, width: "100%", background: mark }} />
            </button>
          );
        })}
      </div>

      <div
        className="mt-3 flex flex-wrap gap-3.5 text-[11px]"
        style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}
      >
        <span className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 3, background: "var(--dc-accent)" }} />
          Training
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 3, background: "var(--dc-accent-2-500)" }} />
          Wettkampf
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 3, background: "var(--dc-neutral-400)" }} />
          Extern
        </span>
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 10,
              height: 10,
              background: "color-mix(in srgb, var(--dc-accent-2) 6%, var(--dc-surface))",
              border: "1px solid var(--dc-accent-2-700)",
            }}
          />
          Feiertag Berlin
        </span>
        <span className="flex items-center gap-1.5">
          <span
            style={{
              width: 10,
              height: 10,
              background: "color-mix(in srgb, var(--dc-neutral-400) 12%, var(--dc-surface))",
              border: "1px solid var(--dc-divider)",
            }}
          />
          Ferien Berlin
        </span>
      </div>

      <Dialog open={selectedDate !== null} onOpenChange={handleDialogOpenChange}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="dc-dialog max-w-[480px]">
            {selectedDate && (
              <div className="min-w-0">
                <div className="kicker-muted capitalize">{formatDateLabel(selectedDate)}</div>

                {selectedItems.length === 0 && (
                  <p
                    className="mt-3 text-[13px] leading-[1.5]"
                    style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}
                  >
                    Für diesen Tag ist nichts geplant.
                  </p>
                )}

                {selectedItems.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {selectedItems.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex min-w-0 items-center gap-2.5 p-2.5"
                        style={{ background: "var(--dc-bg)", borderLeft: `3px solid ${item.color}` }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-[14px]">{item.title}</span>
                            {item.status === "proposed" && (
                              <span className="tag tag-accent-2 shrink-0">Vorschlag</span>
                            )}
                          </div>
                          {item.subtitle && (
                            <div
                              className="mt-0.5 truncate text-xs"
                              style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                        <span
                          className="shrink-0 text-xs"
                          style={{ color: "color-mix(in srgb, var(--dc-text) 45%, transparent)" }}
                        >
                          →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {enableDragDrop && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--dc-divider)" }}>
                    {!showCreatePicker ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowCreatePicker(true)}
                      >
                        + Neues Training
                      </button>
                    ) : (
                      <div>
                        <div className="kicker-muted">
                          Neues Training am {formatDateShort(selectedDate)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            href={`/trainer/plans/new?type=Athletik&date=${selectedDate}`}
                            className="btn btn-primary"
                          >
                            Athletiktraining
                          </Link>
                          <Link
                            href={`/trainer/plans/new?type=Sportartspezifisch&date=${selectedDate}`}
                            className="btn btn-secondary"
                          >
                            Sportartspezifisch
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
