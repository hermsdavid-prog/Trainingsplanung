"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { upsertExerciseResultAction, deleteExerciseResultSetAction } from "@/lib/actions/exercise-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusIcon, Trash2Icon } from "lucide-react";

export type SetType = "aufwaermsatz" | "arbeitssatz";
export type ExerciseSet = { weight: string; reps: string; type: SetType };

const SET_TYPE_LABEL: Record<SetType, string> = {
  aufwaermsatz: "Aufwärmsatz",
  arbeitssatz: "Arbeitssatz",
};

// One dialog per exercise: enter reps + weight for every set at once, in a
// stacked layout with large touch targets — this is the primary way
// athletes log a workout, almost always from a phone. Sets are tagged as
// Aufwärmsatz or Arbeitssatz so warm-ups don't skew the progress trend
// (only Arbeitssätze count toward the "top set" per day).
export function ExerciseSetEntryDialog({
  open,
  onOpenChange,
  exerciseName,
  exerciseId,
  planId,
  planDate,
  initialSets,
  initialUnit,
  suggestedSetCount = 1,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  exerciseId: string | null;
  planId: string;
  planDate: string;
  initialSets: ExerciseSet[];
  initialUnit?: string;
  suggestedSetCount?: number;
  onSaved?: (sets: ExerciseSet[], unit: string) => void;
}) {
  const [sets, setSets] = useState<ExerciseSet[]>(
    initialSets.length > 0
      ? initialSets
      : Array.from({ length: Math.max(1, suggestedSetCount) }, () => ({
          weight: "",
          reps: "",
          type: "arbeitssatz" as SetType,
        }))
  );
  const [unit, setUnit] = useState(initialUnit ?? "kg");
  const [isPending, startTransition] = useTransition();

  function updateSet(index: number, field: "weight" | "reps", value: string) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addSet(type: SetType) {
    setSets((prev) => [...prev, { weight: "", reps: "", type }]);
  }

  function removeSet(index: number) {
    setSets((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!exerciseId) return;
    startTransition(async () => {
      const originalCount = initialSets.length;
      let position = 0;
      for (const set of sets) {
        const weight = Number(set.weight.replace(",", "."));
        if (!set.weight.trim() || Number.isNaN(weight)) continue;
        position += 1;
        const reps = set.reps.trim() ? Number(set.reps.replace(",", ".")) : null;
        const result = await upsertExerciseResultAction(
          exerciseId,
          planDate,
          position,
          weight,
          reps,
          unit,
          planId,
          set.type
        );
        if (result.error) {
          toast.error(result.error);
          return;
        }
      }
      for (let n = position + 1; n <= originalCount; n++) {
        await deleteExerciseResultSetAction(exerciseId, planDate, n);
      }
      toast.success("Ergebnisse gespeichert.");
      onSaved?.(sets, unit);
      onOpenChange(false);
    });
  }

  const typeCounts: Partial<Record<SetType, number>> = {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ergebnis — {exerciseName}</DialogTitle>
        </DialogHeader>

        {!exerciseId ? (
          <p className="text-sm text-muted-foreground">
            Bitte zuerst die Übungstabelle speichern — danach kann hier ein Ergebnis erfasst
            werden.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="result-unit">Einheit</Label>
              <Input
                id="result-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg"
                className="w-24"
              />
            </div>

            <div className="flex flex-col gap-3">
              {sets.map((set, index) => {
                typeCounts[set.type] = (typeCounts[set.type] ?? 0) + 1;
                return (
                  <div key={index} className="flex items-end gap-2">
                    <span className="w-24 pb-2.5 text-sm font-medium text-muted-foreground">
                      {SET_TYPE_LABEL[set.type]} {typeCounts[set.type]}
                    </span>
                    <div className="flex flex-1 flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Wdh.</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={set.reps}
                        onChange={(e) => updateSet(index, "reps", e.target.value)}
                        placeholder="10"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Gewicht</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={set.weight}
                        onChange={(e) => updateSet(index, "weight", e.target.value)}
                        placeholder="60"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeSet(index)}
                      aria-label="Satz entfernen"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                );
              })}

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSet("aufwaermsatz")}
                >
                  <PlusIcon /> Aufwärmsatz hinzufügen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSet("arbeitssatz")}
                >
                  <PlusIcon /> Arbeitssatz hinzufügen
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || !exerciseId} className="w-full sm:w-auto">
            {isPending ? "Wird gespeichert…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
