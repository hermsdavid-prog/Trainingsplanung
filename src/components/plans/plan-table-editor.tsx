"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { savePlanItemsAction } from "@/lib/actions/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2Icon, NotebookTextIcon, PlusIcon } from "lucide-react";

type Row = {
  exercise_name: string;
  reps_or_duration: string;
  sets: string;
  notes: string;
};

const EMPTY_ROW: Row = { exercise_name: "", reps_or_duration: "", sets: "", notes: "" };

export function PlanTableEditor({
  planId,
  initialItems,
}: {
  planId: string;
  initialItems: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0 ? initialItems : [{ ...EMPTY_ROW }]
  );
  const [notesOpenIndex, setNotesOpenIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await savePlanItemsAction(planId, rows);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Übungstabelle gespeichert.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left font-medium">Übung</th>
              <th className="p-2 text-left font-medium">Anzahl / Dauer</th>
              <th className="p-2 text-left font-medium">Sätze</th>
              <th className="p-2 text-left font-medium">Hinweise</th>
              <th className="w-8 p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t">
                <td className="p-2">
                  <Input
                    value={row.exercise_name}
                    onChange={(e) => updateRow(index, "exercise_name", e.target.value)}
                    placeholder="z. B. Kniebeuge"
                    className="min-w-36"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={row.reps_or_duration}
                    onChange={(e) => updateRow(index, "reps_or_duration", e.target.value)}
                    placeholder="z. B. 10 Wdh. / 30 Sek."
                    className="min-w-32"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={row.sets}
                    onChange={(e) => updateRow(index, "sets", e.target.value)}
                    placeholder="z. B. 4"
                    className="w-20"
                  />
                </td>
                <td className="p-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNotesOpenIndex(index)}
                  >
                    <NotebookTextIcon />
                    {row.notes ? "Hinweise bearbeiten" : "Hinweise hinzufügen"}
                  </Button>
                </td>
                <td className="p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeRow(index)}
                    aria-label="Zeile entfernen"
                  >
                    <Trash2Icon />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <PlusIcon /> Übung hinzufügen
        </Button>
        <Button type="button" onClick={handleSave} disabled={isPending}>
          {isPending ? "Wird gespeichert…" : "Übungstabelle speichern"}
        </Button>
      </div>

      <Dialog
        open={notesOpenIndex !== null}
        onOpenChange={(open) => !open && setNotesOpenIndex(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hinweise{" "}
              {notesOpenIndex !== null &&
                rows[notesOpenIndex]?.exercise_name &&
                `— ${rows[notesOpenIndex].exercise_name}`}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={8}
            value={notesOpenIndex !== null ? rows[notesOpenIndex]?.notes ?? "" : ""}
            onChange={(e) =>
              notesOpenIndex !== null && updateRow(notesOpenIndex, "notes", e.target.value)
            }
            placeholder="Ausführliche Erklärung zur Übung, Technikhinweise, Zielsetzung …"
          />
          <DialogFooter>
            <Button onClick={() => setNotesOpenIndex(null)}>Übernehmen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
