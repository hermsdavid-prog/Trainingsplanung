"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleMesocycleGoalAction,
  createMesocycleGoalAction,
  deleteMesocycleGoalAction,
} from "@/lib/actions/mesocycle-goals";

export type MesocycleGoal = { id: string; text: string; achievedAt: string | null; ownGoal: boolean };

// The athlete's own view of their Trainingsziele for one Mesozyklus: a
// checkbox to mark any goal achieved (trainer-written or their own), plus
// the ability to add their own short goals here and remove the ones they
// wrote themselves — a trainer-written goal stays only editable/removable
// by the trainer, see src/components/athletes/goal-list.tsx.
export function GoalToggleList({
  goals,
  mesocycleId,
  athleteId,
  heading = "Trainingsziele",
}: {
  goals: MesocycleGoal[];
  mesocycleId: string;
  athleteId: string;
  // Overridable so a caller that already groups several Mesozyklen under
  // one "Trainingsziele" heading (see GoalsPanel) can label each instance
  // by Mesozyklus name instead of repeating the generic heading.
  heading?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const router = useRouter();

  function toggle(id: string, next: boolean) {
    startTransition(async () => {
      await toggleMesocycleGoalAction(id, next);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMesocycleGoalAction(id);
      router.refresh();
    });
  }

  function addGoal() {
    if (!newText.trim()) return;
    startTransition(async () => {
      await createMesocycleGoalAction({ mesocycleId, athleteId, text: newText });
      setNewText("");
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: "var(--dc-divider)" }}>
      <div className="kicker-muted">{heading}</div>
      {goals.length === 0 && !adding && <p className="text-xs text-muted">Noch keine Ziele.</p>}
      {goals.map((g) => (
        <div key={g.id} className="flex items-center gap-2 text-[13px]" style={{ opacity: g.achievedAt ? 0.6 : 1 }}>
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <input
              type="checkbox"
              checked={g.achievedAt != null}
              disabled={isPending}
              onChange={(e) => toggle(g.id, e.target.checked)}
            />
            <span className="truncate" style={{ textDecoration: g.achievedAt ? "line-through" : "none" }}>
              {g.text}
            </span>
          </label>
          {g.ownGoal && (
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              disabled={isPending}
              onClick={() => remove(g.id)}
              aria-label="Eigenes Ziel löschen"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {adding ? (
        <div className="mt-1 flex gap-2">
          <input
            className="input flex-1"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="z. B. mehr auf Technik achten"
            autoFocus
          />
          <button type="button" className="btn btn-primary shrink-0" disabled={isPending || !newText.trim()} onClick={addGoal}>
            Hinzufügen
          </button>
          <button type="button" className="btn btn-ghost shrink-0" onClick={() => setAdding(false)}>
            Abbrechen
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-ghost mt-1 self-start" onClick={() => setAdding(true)}>
          + Eigenes Ziel
        </button>
      )}
    </div>
  );
}
