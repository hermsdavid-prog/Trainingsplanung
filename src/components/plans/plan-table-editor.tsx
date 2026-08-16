"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { savePlanItemsAction } from "@/lib/actions/plans";
import { upsertExerciseResultAction } from "@/lib/actions/exercise-results";
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
  exercise_id?: string | null;
  result_value?: string;
  result_unit?: string;
};

const EMPTY_ROW: Row = {
  exercise_name: "",
  reps_or_duration: "",
  sets: "",
  notes: "",
  exercise_id: null,
  result_value: "",
  result_unit: "",
};

const EXERCISE_LIST_ID = "exercise-library-options";

export function PlanTableEditor({
  planId,
  initialItems,
  exerciseLibrary = [],
  categoryLabel,
  trackResults = false,
  planDate,
}: {
  planId: string;
  initialItems: Row[];
  exerciseLibrary?: { id: string; name: string }[];
  categoryLabel?: string | null;
  trackResults?: boolean;
  planDate?: string;
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0 ? initialItems.map((r) => ({ ...EMPTY_ROW, ...r })) : [{ ...EMPTY_ROW }]
  );
  const [notesOpenIndex, setNotesOpenIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAthletik = categoryLabel?.trim().toLowerCase() === "athletik";
  const nameByLowercase = new Map(exerciseLibrary.map((e) => [e.name.toLowerCase(), e]));

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [field]: value };
        if (field === "exercise_name") {
          const match = nameByLowercase.get(value.trim().toLowerCase());
          next.exercise_id = match?.id ?? null;
        }
        return next;
      })
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
        return;
      }

      if (trackResults && planDate) {
        for (const row of rows) {
          if (!row.exercise_id || !row.result_value?.trim()) continue;
          const value = Number(row.result_value.replace(",", "."));
          if (Number.isNaN(value)) continue;
          await upsertExerciseResultAction(row.exercise_id, planDate, value, row.result_unit ?? "", planId);
        }
      }

      toast.success("Übungstabelle gespeichert.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {isAthletik && (
        <datalist id={EXERCISE_LIST_ID}>
          {exerciseLibrary.map((e) => (
            <option key={e.id} value={e.name} />
          ))}
        </datalist>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left font-medium">Übung</th>
              <th className="p-2 text-left font-medium">Anzahl / Dauer</th>
              <th className="p-2 text-left font-medium">Sätze</th>
              {isAthletik && trackResults && (
                <th className="p-2 text-left font-medium">Ergebnis</th>
              )}
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
                    list={isAthletik ? EXERCISE_LIST_ID : undefined}
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
                {isAthletik && trackResults && (
                  <td className="p-2">
                    {row.exercise_id ? (
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={row.result_value ?? ""}
                          onChange={(e) => updateRow(index, "result_value", e.target.value)}
                          placeholder="z. B. 60"
                          className="w-20"
                        />
                        <Input
                          value={row.result_unit ?? ""}
                          onChange={(e) => updateRow(index, "result_unit", e.target.value)}
                          placeholder="kg"
                          className="w-16"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Übung aus Bibliothek wählen
                      </span>
                    )}
                  </td>
                )}
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

      {isAthletik && trackResults && (
        <p className="text-xs text-muted-foreground">
          Trage bei Übungen aus der Athletik-Bibliothek ein Ergebnis ein (z. B. Gewicht,
          Höhe, Zeit) — das wird für die Fortschrittskurve gespeichert.
        </p>
      )}

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
