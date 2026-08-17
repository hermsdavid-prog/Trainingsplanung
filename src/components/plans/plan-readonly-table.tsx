"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NotebookTextIcon, LinkIcon } from "lucide-react";

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
    return (
      <p className="text-sm text-muted-foreground">
        Für diesen Plan wurden noch keine Übungen eingetragen.
      </p>
    );
  }

  const indexed = items.map((row, index) => ({ row, index }));
  const kraftRows = indexed.filter(({ row }) => !isAthletik || row.section !== "cardio");
  const cardioRows = indexed.filter(({ row }) => isAthletik && row.section === "cardio");

  const notesRow = notesOpenIndex !== null ? items[notesOpenIndex] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {isAthletik && <h3 className="text-sm font-semibold">Kraft</h3>}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">Übung</th>
                <th className="p-2 text-left font-medium">Anzahl / Dauer</th>
                <th className="p-2 text-left font-medium">Sätze</th>
                <th className="p-2 text-left font-medium">Pause</th>
                <th className="p-2 text-left font-medium">Hinweise / Link</th>
              </tr>
            </thead>
            <tbody>
              {kraftRows.map(({ row, index }) => (
                <tr key={index} className="border-t">
                  <td className="p-2">{row.exercise_name}</td>
                  <td className="p-2">{row.reps_or_duration || "—"}</td>
                  <td className="p-2">{row.sets || "—"}</td>
                  <td className="p-2">{row.rest_time || "—"}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      {row.notes ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNotesOpenIndex(index)}
                        >
                          <NotebookTextIcon /> Hinweise
                        </Button>
                      ) : null}
                      {row.link_url ? (
                        <a
                          href={row.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
                        >
                          <LinkIcon className="size-3.5" /> Link
                        </a>
                      ) : null}
                      {!row.notes && !row.link_url && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAthletik && cardioRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Cardio</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Übung</th>
                  <th className="p-2 text-left font-medium">Belastung</th>
                  <th className="p-2 text-left font-medium">Pause</th>
                  <th className="p-2 text-left font-medium">Runden</th>
                  <th className="p-2 text-left font-medium">Rundenpause</th>
                  <th className="p-2 text-left font-medium">Herzfrequenz (on)</th>
                  <th className="p-2 text-left font-medium">Herzfrequenz (off)</th>
                  <th className="p-2 text-left font-medium">Hinweise / Link</th>
                </tr>
              </thead>
              <tbody>
                {cardioRows.map(({ row, index }) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{row.exercise_name}</td>
                    <td className="p-2">{row.reps_or_duration || "—"}</td>
                    <td className="p-2">{row.rest_time || "—"}</td>
                    <td className="p-2">{row.sets || "—"}</td>
                    <td className="p-2">{row.round_rest || "—"}</td>
                    <td className="p-2">{row.heart_rate_on || "—"}</td>
                    <td className="p-2">{row.heart_rate_off || "—"}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {row.notes ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNotesOpenIndex(index)}
                          >
                            <NotebookTextIcon /> Hinweise
                          </Button>
                        ) : null}
                        {row.link_url ? (
                          <a
                            href={row.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
                          >
                            <LinkIcon className="size-3.5" /> Link
                          </a>
                        ) : null}
                        {!row.notes && !row.link_url && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog
        open={notesOpenIndex !== null}
        onOpenChange={(open) => !open && setNotesOpenIndex(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hinweise {notesRow?.exercise_name && `— ${notesRow.exercise_name}`}
            </DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm">{notesRow?.notes}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
