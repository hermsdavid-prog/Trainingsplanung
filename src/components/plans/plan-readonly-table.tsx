"use client";

import { useState } from "react";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";

type Row = {
  exercise_name: string;
  reps_or_duration: string | null;
  sets: string | null;
  rest_time?: string | null;
  notes: string | null;
  link_url?: string | null;
  section?: string;
  round_rest?: string | null;
  heart_rate_on?: string | null;
  heart_rate_off?: string | null;
};

export function PlanReadOnlyTable({
  items,
  categoryLabel,
}: {
  items: Row[];
  categoryLabel?: string | null;
}) {
  const [notesOpenIndex, setNotesOpenIndex] = useState<number | null>(null);

  const isAthletik = categoryLabel?.trim().toLowerCase() === "athletik";

  if (items.length === 0) {
    return <p className="text-sm text-muted">Für diesen Plan wurden noch keine Übungen eingetragen.</p>;
  }

  const indexed = items.map((row, index) => ({ row, index }));
  const kraftRows = indexed.filter(({ row }) => !isAthletik || row.section !== "cardio");
  const cardioRows = indexed.filter(({ row }) => isAthletik && row.section === "cardio");

  const notesRow = notesOpenIndex !== null ? items[notesOpenIndex] : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div>
        {isAthletik && <div className="kicker-muted mb-2">Kraft</div>}
        <table className="table">
          <thead>
            <tr>
              <th>Übung</th>
              <th>Anzahl / Dauer</th>
              <th>Sätze</th>
              <th>Pause</th>
              <th>Hinweise / Link</th>
            </tr>
          </thead>
          <tbody>
            {kraftRows.map(({ row, index }) => (
              <tr key={index}>
                <td className="text-[15px]">{row.exercise_name}</td>
                <td>{row.reps_or_duration || "—"}</td>
                <td>{row.sets || "—"}</td>
                <td>{row.rest_time || "—"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    {row.notes && (
                      <button type="button" className="btn btn-ghost" onClick={() => setNotesOpenIndex(index)}>
                        Hinweise
                      </button>
                    )}
                    {row.link_url && (
                      <a href={row.link_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                        Link
                      </a>
                    )}
                    {!row.notes && !row.link_url && <span className="text-muted">—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAthletik && cardioRows.length > 0 && (
        <div>
          <div className="kicker-accent-2 mb-2">Cardio</div>
          <table className="table">
            <thead>
              <tr>
                <th>Übung</th>
                <th>Belastung</th>
                <th>Pause</th>
                <th>Runden</th>
                <th>Rundenpause</th>
                <th>HF on</th>
                <th>HF off</th>
                <th>Hinweise / Link</th>
              </tr>
            </thead>
            <tbody>
              {cardioRows.map(({ row, index }) => (
                <tr key={index}>
                  <td className="text-[15px]">{row.exercise_name}</td>
                  <td>{row.reps_or_duration || "—"}</td>
                  <td>{row.rest_time || "—"}</td>
                  <td>{row.sets || "—"}</td>
                  <td>{row.round_rest || "—"}</td>
                  <td>{row.heart_rate_on || "—"}</td>
                  <td>{row.heart_rate_off || "—"}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {row.notes && (
                        <button type="button" className="btn btn-ghost" onClick={() => setNotesOpenIndex(index)}>
                          Hinweise
                        </button>
                      )}
                      {row.link_url && (
                        <a href={row.link_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                          Link
                        </a>
                      )}
                      {!row.notes && !row.link_url && <span className="text-muted">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={notesOpenIndex !== null} onOpenChange={(open) => !open && setNotesOpenIndex(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton={false} className="dc-dialog max-w-[440px]">
            <div className="kicker-muted">
              Hinweise {notesRow?.exercise_name && `— ${notesRow.exercise_name}`}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{notesRow?.notes}</p>
            <button type="button" className="btn btn-primary mt-2 self-start" onClick={() => setNotesOpenIndex(null)}>
              Schließen
            </button>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
