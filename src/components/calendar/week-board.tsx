"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatWeekdayShort } from "@/lib/date";
import { getBerlinCalendarMark } from "@/lib/berlin-holidays";
import {
  reschedulePlanAction,
  duplicatePlanToDateAction,
  deletePlanAction,
} from "@/lib/actions/plans";
import {
  rescheduleEventAction,
  duplicateEventToDateAction,
  deleteEventAction,
  confirmEventAction,
} from "@/lib/actions/events";

export type WeekItem = {
  id: string;
  kind: "plan" | "event";
  title: string;
  href: string | null;
  who: string;
  time: string;
  tone: string;
  typeLabel: string;
  status?: string;
  description?: string | null;
};

const DEFAULT_DRAG_HINT =
  "Trainings und Termine lassen sich per Drag & Drop verschieben (mit gedrückter Strg-Taste, Mac: Cmd, wird stattdessen eine Kopie angelegt). Auf dem Handy: Termin antippen, dann bei einem Tag „Hierhin kopieren“ wählen.";

function subscribeNoop() {
  return () => {};
}
function getCoarsePointerSnapshot() {
  return window.matchMedia("(pointer: coarse)").matches;
}
function getCoarsePointerServerSnapshot() {
  return false;
}

export function WeekBoard({ days, itemsByDate }: { days: string[]; itemsByDate: Record<string, WeekItem[]> }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [copyMode, setCopyMode] = useState(false);
  const [armedItem, setArmedItem] = useState<WeekItem | null>(null);
  const [draggingItem, setDraggingItem] = useState<WeekItem | null>(null);

  const isCoarsePointer = useSyncExternalStore(
    subscribeNoop,
    getCoarsePointerSnapshot,
    getCoarsePointerServerSnapshot
  );

  const dragActive = armedItem !== null || draggingItem !== null;
  const dragHint = armedItem
    ? `„${armedItem.title}“ ausgewählt — bei einem Tag auf „Hierhin kopieren“ tippen.`
    : draggingItem
      ? `„${draggingItem.title}“ wird verschoben — auf einen Tag ziehen (mit Strg/Cmd: kopieren).`
      : DEFAULT_DRAG_HINT;

  function cancelDrag() {
    setArmedItem(null);
    setDraggingItem(null);
  }

  function toggleArmed(item: WeekItem) {
    setArmedItem((current) => (current?.id === item.id ? null : item));
  }

  function handleDragStart(e: React.DragEvent, item: WeekItem) {
    e.dataTransfer.setData("application/json", JSON.stringify({ id: item.id, kind: item.kind }));
    e.dataTransfer.effectAllowed = "copyMove";
    setDraggingItem(item);
  }

  function handleDragEnd() {
    setDraggingItem(null);
    setDragOverDate(null);
  }

  function runMove(id: string, kind: "plan" | "event", day: string, copy: boolean) {
    startTransition(async () => {
      const result = copy
        ? kind === "plan"
          ? await duplicatePlanToDateAction(id, day)
          : await duplicateEventToDateAction(id, day)
        : kind === "plan"
          ? await reschedulePlanAction(id, day)
          : await rescheduleEventAction(id, day);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(copy ? "Termin kopiert." : "Termin verschoben.");
        router.refresh();
      }
    });
  }

  function handleDrop(e: React.DragEvent, day: string) {
    e.preventDefault();
    const isCopy = e.ctrlKey || e.metaKey;
    setDragOverDate(null);
    const raw = e.dataTransfer.getData("application/json");
    setDraggingItem(null);
    if (!raw) return;
    const { id, kind } = JSON.parse(raw) as { id: string; kind: "plan" | "event" };
    runMove(id, kind, day, isCopy);
  }

  function handleTapCopy(day: string) {
    if (!armedItem) return;
    runMove(armedItem.id, armedItem.kind, day, true);
    setArmedItem(null);
  }

  function handleRemove(item: WeekItem) {
    const label = item.kind === "plan" ? "Trainingsplan" : "Termin";
    if (!confirm(`${label} "${item.title}" wirklich löschen?`)) return;
    startTransition(async () => {
      const result =
        item.kind === "plan" ? await deletePlanAction(item.id) : await deleteEventAction(item.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Gelöscht.");
        router.refresh();
      }
    });
  }

  function handleConfirm(item: WeekItem) {
    startTransition(async () => {
      const result = await confirmEventAction(item.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Bestätigt.");
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div
        className="mt-5 flex items-center justify-between gap-4"
        style={{ padding: "11px 14px", background: "var(--dc-surface)" }}
      >
        <span className="text-[13px] leading-[1.5]">{dragHint}</span>
        {dragActive && (
          <button type="button" className="btn btn-ghost shrink-0" onClick={cancelDrag}>
            Abbrechen
          </button>
        )}
      </div>

      <div
        className="mt-4.5 grid w-full gap-2.5 overflow-x-auto pb-1.5"
        style={{ gridAutoFlow: "column", gridAutoColumns: "minmax(128px, 1fr)" }}
      >
        {days.map((day) => {
          const items = itemsByDate[day] ?? [];
          const isOver = dragOverDate === day;
          const dropBorder = isOver ? (copyMode ? "var(--dc-accent-2)" : "var(--dc-accent)") : "transparent";
          const dropBg = isOver
            ? copyMode
              ? "color-mix(in srgb, var(--dc-accent-2) 8%, transparent)"
              : "color-mix(in srgb, var(--dc-accent) 8%, transparent)"
            : "transparent";
          return (
            <div
              key={day}
              onDragOver={
                !isCoarsePointer
                  ? (e) => {
                      e.preventDefault();
                      const isCopy = e.ctrlKey || e.metaKey;
                      e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
                      setDragOverDate(day);
                      setCopyMode(isCopy);
                    }
                  : undefined
              }
              onDragLeave={!isCoarsePointer ? () => setDragOverDate(null) : undefined}
              onDrop={!isCoarsePointer ? (e) => handleDrop(e, day) : undefined}
              style={{ minWidth: 0, padding: 6, border: `1px dashed ${dropBorder}`, background: dropBg }}
            >
              <div
                className="pb-2 text-xs"
                style={{
                  borderBottom: "1px solid var(--dc-divider)",
                  color: "color-mix(in srgb, var(--dc-text) 60%, transparent)",
                }}
              >
                {formatWeekdayShort(day)}
                {getBerlinCalendarMark(day) && (
                  <span
                    className="ml-1.5"
                    style={{
                      color:
                        getBerlinCalendarMark(day)!.type === "feiertag"
                          ? "var(--dc-accent-2-700)"
                          : "color-mix(in srgb, var(--dc-text) 55%, transparent)",
                    }}
                  >
                    · {getBerlinCalendarMark(day)!.label}
                  </span>
                )}
              </div>
              <div
                className="mt-2.5 flex flex-col gap-2 overflow-y-auto overflow-x-hidden"
                style={{ minHeight: 220, maxHeight: 440 }}
              >
                {items.map((item) => {
                  const isFaded = draggingItem?.id === item.id || armedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      draggable={!isCoarsePointer}
                      onDragStart={!isCoarsePointer ? (e) => handleDragStart(e, item) : undefined}
                      onDragEnd={!isCoarsePointer ? handleDragEnd : undefined}
                      style={{
                        minWidth: 0,
                        padding: "8px 10px",
                        background: "var(--dc-bg)",
                        borderLeft: `2px solid ${item.tone}`,
                        cursor: isCoarsePointer ? "default" : "grab",
                        opacity: isFaded ? 0.4 : 1,
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className="text-[11px]"
                          style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}
                        >
                          {item.time}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleArmed(item)}
                          aria-label="Zum Kopieren auswählen"
                          className="text-xs"
                          style={{
                            background: "transparent",
                            border: 0,
                            cursor: "pointer",
                            color:
                              armedItem?.id === item.id
                                ? "var(--dc-accent)"
                                : "color-mix(in srgb, var(--dc-text) 40%, transparent)",
                          }}
                        >
                          ⠿
                        </button>
                      </div>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="mt-0.5 block text-[13px] leading-[1.25]"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <div
                          className="mt-0.5 text-[13px] leading-[1.25]"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {item.title}
                        </div>
                      )}
                      <div
                        className="mt-1 text-[11px] leading-[1.3]"
                        style={{ overflowWrap: "anywhere", color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}
                      >
                        {item.who}
                        {item.status === "proposed" && <span className="tag tag-outline ml-1.5">Vorschlag</span>}
                      </div>
                      {item.description && (
                        <div
                          className="mt-1 text-[11px] leading-[1.3]"
                          style={{ overflowWrap: "anywhere", color: "color-mix(in srgb, var(--dc-text) 75%, transparent)" }}
                          title={item.description}
                        >
                          {item.description}
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-1.5">
                        <span
                          className="text-[10px] uppercase"
                          style={{ letterSpacing: "0.08em", color: item.tone }}
                        >
                          {item.typeLabel}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.status === "proposed" && (
                            <button type="button" className="btn btn-ghost" onClick={() => handleConfirm(item)}>
                              Bestätigen
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => handleRemove(item)}
                            aria-label="Termin entfernen"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {armedItem && (
                  <button type="button" className="btn btn-secondary" onClick={() => handleTapCopy(day)}>
                    Hierhin kopieren
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
