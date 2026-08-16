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
};

export function PlanReadOnlyTable({ items }: { items: Row[] }) {
  const [notesOpenIndex, setNotesOpenIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Für diesen Plan wurden noch keine Übungen eingetragen.
      </p>
    );
  }

  return (
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
          {items.map((row, index) => (
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

      <Dialog
        open={notesOpenIndex !== null}
        onOpenChange={(open) => !open && setNotesOpenIndex(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hinweise{" "}
              {notesOpenIndex !== null &&
                items[notesOpenIndex]?.exercise_name &&
                `— ${items[notesOpenIndex].exercise_name}`}
            </DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm">
            {notesOpenIndex !== null ? items[notesOpenIndex]?.notes : ""}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
