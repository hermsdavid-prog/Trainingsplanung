"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEventAction } from "@/lib/actions/events";
import { formatDateLabel } from "@/lib/date";

const EVENT_KINDS = [
  { value: "Training", bg: "var(--dc-accent)", fg: "var(--dc-bg)" },
  { value: "Wettkampf", bg: "var(--dc-accent-2-500)", fg: "var(--dc-bg)" },
  { value: "Extern", bg: "var(--dc-neutral-400)", fg: "var(--dc-text)" },
] as const;

export function CreateEventDialog({
  defaultDate,
  groups,
}: {
  defaultDate: string;
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<(typeof EVENT_KINDS)[number]["value"]>("Training");
  const [who, setWho] = useState<string>("alle");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const router = useRouter();

  function reset() {
    setKind("Training");
    setWho("alle");
    setTitle("");
    setDate(defaultDate);
    setTime("");
    setError(undefined);
  }

  function handleSave() {
    setError(undefined);
    const kindMeta = EVENT_KINDS.find((k) => k.value === kind)!;
    startTransition(async () => {
      const result = await createEventAction({
        title,
        description: "",
        eventType: kind,
        color: kindMeta.bg.startsWith("var(") ? resolveVar(kindMeta.bg) : kindMeta.bg,
        date,
        time,
        allDay: !time,
        groupId: who !== "alle" ? who : null,
        athleteId: null,
        repeatUntil: null,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        reset();
        router.refresh();
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setDate(defaultDate);
            setOpen(true);
          }
        }}
      >
        {open ? "Schließen" : "Termin anlegen"}
      </button>

      {open && (
        <div className="mt-5 max-w-[880px] p-5" style={{ background: "var(--dc-surface)" }}>
          <div className="kicker-muted">Termin anlegen</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {EVENT_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                className="chip"
                onClick={() => setKind(k.value)}
                style={{
                  background: kind === k.value ? k.bg : "transparent",
                  color: kind === k.value ? k.fg : "var(--dc-text)",
                }}
              >
                {k.value}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-start gap-3.5">
            <div className="field min-w-[220px] flex-1">
              <label htmlFor="ev-title">Titel</label>
              <input
                id="ev-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Bezirksmeisterschaft"
              />
            </div>
            <div className="field w-[170px]">
              <label htmlFor="ev-date">Datum · {formatDateLabel(date)}</label>
              <input
                id="ev-date"
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="field w-[110px]">
              <label htmlFor="ev-time">Uhrzeit</label>
              <input
                id="ev-time"
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="10:00"
              />
            </div>
          </div>

          <div className="mt-4 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
            Für wen
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="chip"
              onClick={() => setWho("alle")}
              style={{
                background: who === "alle" ? "var(--dc-accent)" : "transparent",
                color: who === "alle" ? "var(--dc-bg)" : "var(--dc-text)",
              }}
            >
              Alle
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                className="chip"
                onClick={() => setWho(g.id)}
                style={{
                  background: who === g.id ? "var(--dc-accent)" : "transparent",
                  color: who === g.id ? "var(--dc-bg)" : "var(--dc-text)",
                }}
              >
                {g.name}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
              {error}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary mt-4.5"
            disabled={isPending || !title.trim() || !date}
            onClick={handleSave}
          >
            {isPending ? "Wird gespeichert…" : "Termin speichern"}
          </button>
        </div>
      )}
    </div>
  );
}

function resolveVar(cssVar: string): string {
  const map: Record<string, string> = {
    "var(--dc-accent)": "#0088b0",
    "var(--dc-accent-2-500)": "#ff458e",
    "var(--dc-neutral-400)": "#bab6b6",
  };
  return map[cssVar] ?? "#0088b0";
}
