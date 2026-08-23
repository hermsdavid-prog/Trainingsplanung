"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { upsertExerciseResultAction, deleteExerciseResultSetAction } from "@/lib/actions/exercise-results";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";
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
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[420px]">
          <div className="kicker-muted">Ergebnis — {exerciseName}</div>

          {!exerciseId ? (
            <p className="mt-2 text-sm text-muted">
              Bitte zuerst den Plan speichern — danach kann hier ein Ergebnis erfasst
              werden.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div className="field">
                <label htmlFor="result-unit">Einheit</label>
                <input
                  id="result-unit"
                  className="input w-24"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="kg"
                />
              </div>

              <div className="flex flex-col gap-2.5">
                {sets.map((set, index) => {
                  typeCounts[set.type] = (typeCounts[set.type] ?? 0) + 1;
                  return (
                    <div key={index} className="flex items-end gap-2">
                      <span
                        className="w-[92px] pb-2 text-[13px]"
                        style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}
                      >
                        {SET_TYPE_LABEL[set.type]} {typeCounts[set.type]}
                      </span>
                      <div className="field flex-1">
                        <label className="!text-[11px]">Wdh.</label>
                        <input
                          className="input"
                          inputMode="decimal"
                          value={set.reps}
                          onChange={(e) => updateSet(index, "reps", e.target.value)}
                          placeholder="10"
                        />
                      </div>
                      <div className="field flex-1">
                        <label className="!text-[11px]">Gewicht</label>
                        <input
                          className="input"
                          inputMode="decimal"
                          value={set.weight}
                          onChange={(e) => updateSet(index, "weight", e.target.value)}
                          placeholder="60"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeSet(index)}
                        aria-label="Satz entfernen"
                      >
                        <Trash2Icon />
                      </button>
                    </div>
                  );
                })}

                <div className="mt-1 flex gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => addSet("aufwaermsatz")}>
                    <PlusIcon /> Aufwärmsatz
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => addSet("arbeitssatz")}>
                    <PlusIcon /> Arbeitssatz
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSave}
            disabled={isPending || !exerciseId}
          >
            {isPending ? "Wird gespeichert…" : "Speichern"}
          </button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
