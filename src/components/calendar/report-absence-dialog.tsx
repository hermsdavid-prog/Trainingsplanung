"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reportTrainerAbsenceAction } from "@/lib/actions/trainer-absence";
import { formatDateLabel } from "@/lib/date";

// One event per day is created for every group the trainer trains — no
// group picker here, unlike CreateEventDialog, since an absence always
// covers all of a trainer's own groups.
export function ReportAbsenceDialog({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const router = useRouter();

  function reset() {
    setStartDate(defaultDate);
    setEndDate(defaultDate);
    setNote("");
    setError(undefined);
  }

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await reportTrainerAbsenceAction({ startDate, endDate, note });
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
        className="btn btn-secondary"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setStartDate(defaultDate);
            setEndDate(defaultDate);
            setOpen(true);
          }
        }}
      >
        {open ? "Schließen" : "Abwesenheit melden"}
      </button>

      {open && (
        <div className="mt-3 max-w-[500px] p-5" style={{ background: "var(--dc-surface)" }}>
          <div className="kicker-muted">Abwesenheit melden</div>
          <p className="mt-1.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
            Erscheint im Kalender aller deiner Gruppen und Athleten.
          </p>

          <div className="mt-3.5 flex flex-wrap items-start gap-3.5">
            <div className="field w-[170px]">
              <label htmlFor="abs-start">Von · {formatDateLabel(startDate)}</label>
              <input
                id="abs-start"
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
              />
            </div>
            <div className="field w-[170px]">
              <label htmlFor="abs-end">Bis · {formatDateLabel(endDate)}</label>
              <input
                id="abs-end"
                type="date"
                className="input"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="field mt-3.5" style={{ margin: 0, marginTop: 14 }}>
            <label htmlFor="abs-note">Hinweis (optional)</label>
            <input
              id="abs-note"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. im Urlaub, Vertretung folgt"
            />
          </div>

          {error && (
            <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
              {error}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary mt-4.5"
            disabled={isPending || !startDate || !endDate}
            onClick={handleSave}
          >
            {isPending ? "Wird gespeichert…" : "Abwesenheit speichern"}
          </button>
        </div>
      )}
    </div>
  );
}
