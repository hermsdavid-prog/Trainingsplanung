"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { upsertFeedbackAction } from "@/lib/actions/feedback";
import { upsertExerciseResultAction } from "@/lib/actions/exercise-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotebookTextIcon } from "lucide-react";

type Item = {
  id: string;
  exercise_name: string;
  reps_or_duration: string | null;
  sets: string | null;
  notes: string | null;
  exercise_id?: string | null;
};

type FeedbackMap = Record<string, { done: boolean; actual_value: string }>;
type ResultMap = Record<string, { value: string; unit: string }>;

export function PlanFeedbackTable({
  items,
  initialFeedback,
  categoryLabel,
  planId,
  planDate,
  initialResults = {},
}: {
  items: Item[];
  initialFeedback: FeedbackMap;
  categoryLabel?: string | null;
  planId?: string;
  planDate?: string;
  initialResults?: ResultMap;
}) {
  const [feedback, setFeedback] = useState<FeedbackMap>(initialFeedback);
  const [results, setResults] = useState<ResultMap>(initialResults);
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isAthletik = categoryLabel?.trim().toLowerCase() === "athletik";

  function getRow(id: string) {
    return feedback[id] ?? { done: false, actual_value: "" };
  }

  function getResult(exerciseId: string) {
    return results[exerciseId] ?? { value: "", unit: "" };
  }

  function toggleDone(id: string, done: boolean) {
    setFeedback((prev) => ({ ...prev, [id]: { ...getRow(id), done } }));
    startTransition(async () => {
      const result = await upsertFeedbackAction(id, { done });
      if (result.error) toast.error(result.error);
    });
  }

  function updateActualValue(id: string, actual_value: string) {
    setFeedback((prev) => ({ ...prev, [id]: { ...getRow(id), actual_value } }));
  }

  function saveActualValue(id: string) {
    startTransition(async () => {
      const result = await upsertFeedbackAction(id, {
        actual_value: getRow(id).actual_value,
      });
      if (result.error) toast.error(result.error);
    });
  }

  function updateResultField(exerciseId: string, field: "value" | "unit", value: string) {
    setResults((prev) => ({ ...prev, [exerciseId]: { ...getResult(exerciseId), [field]: value } }));
  }

  function saveResult(exerciseId: string) {
    if (!planDate || !planId) return;
    const row = getResult(exerciseId);
    const value = Number(row.value.replace(",", "."));
    if (!row.value.trim() || Number.isNaN(value)) return;
    startTransition(async () => {
      const result = await upsertExerciseResultAction(exerciseId, planDate, value, row.unit, planId);
      if (result.error) toast.error(result.error);
    });
  }

  const notesItem = items.find((i) => i.id === notesOpenId);

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="w-8 p-2" />
            <th className="p-2 text-left font-medium">Übung</th>
            <th className="p-2 text-left font-medium">Anzahl / Dauer</th>
            <th className="p-2 text-left font-medium">Sätze</th>
            <th className="p-2 text-left font-medium">Hinweise</th>
            <th className="p-2 text-left font-medium">Ist-Wert / Notiz</th>
            {isAthletik && <th className="p-2 text-left font-medium">Ergebnis</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const row = getRow(item.id);
            return (
              <tr key={item.id} className={`border-t ${row.done ? "bg-muted/30" : ""}`}>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.done}
                    onChange={(e) => toggleDone(item.id, e.target.checked)}
                    aria-label="Erledigt"
                  />
                </td>
                <td className={`p-2 ${row.done ? "line-through text-muted-foreground" : ""}`}>
                  {item.exercise_name}
                </td>
                <td className="p-2">{item.reps_or_duration || "—"}</td>
                <td className="p-2">{item.sets || "—"}</td>
                <td className="p-2">
                  {item.notes ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesOpenId(item.id)}
                    >
                      <NotebookTextIcon /> Hinweise
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-2">
                  <Input
                    value={row.actual_value}
                    onChange={(e) => updateActualValue(item.id, e.target.value)}
                    onBlur={() => saveActualValue(item.id)}
                    placeholder="z. B. tatsächliche Wiederholungen"
                    className="min-w-40"
                  />
                </td>
                {isAthletik && (
                  <td className="p-2">
                    {item.exercise_id ? (
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={getResult(item.exercise_id).value}
                          onChange={(e) =>
                            updateResultField(item.exercise_id!, "value", e.target.value)
                          }
                          onBlur={() => saveResult(item.exercise_id!)}
                          placeholder="z. B. 60"
                          className="w-20"
                        />
                        <Input
                          value={getResult(item.exercise_id).unit}
                          onChange={(e) =>
                            updateResultField(item.exercise_id!, "unit", e.target.value)
                          }
                          onBlur={() => saveResult(item.exercise_id!)}
                          placeholder="kg"
                          className="w-16"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog open={notesOpenId !== null} onOpenChange={(open) => !open && setNotesOpenId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hinweise {notesItem && `— ${notesItem.exercise_name}`}
            </DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm">{notesItem?.notes}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
