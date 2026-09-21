"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateMesocycleGoalTextAction,
  deleteMesocycleGoalAction,
  toggleMesocycleGoalAction,
} from "@/lib/actions/mesocycle-goals";

export type TrainerGoal = { id: string; text: string; achievedAt: string | null };

// The trainer's own view of the selected athlete's goals, grouped by
// Mesozyklus — add/edit/delete live here; the athlete's matching view
// (GoalToggleList) only ever gets a checkbox.
export function GoalList({
  goalsByMesocycle,
  mesocycles,
}: {
  goalsByMesocycle: Map<string, TrainerGoal[]>;
  mesocycles: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const router = useRouter();

  const sections = mesocycles.filter((m) => (goalsByMesocycle.get(m.id) ?? []).length > 0);
  if (sections.length === 0) return null;

  function toggle(id: string, next: boolean) {
    startTransition(async () => {
      await toggleMesocycleGoalAction(id, next);
      router.refresh();
    });
  }

  function startEdit(goal: TrainerGoal) {
    setEditingId(goal.id);
    setEditText(goal.text);
  }

  function saveEdit(id: string) {
    if (!editText.trim()) return;
    startTransition(async () => {
      await updateMesocycleGoalTextAction(id, editText);
      setEditingId(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMesocycleGoalAction(id);
      router.refresh();
    });
  }

  return (
    <div className="mt-5 flex flex-col gap-5">
      {sections.map((m) => (
        <div key={m.id}>
          <div className="kicker-muted">{m.title}</div>
          <div className="mt-2 flex flex-col gap-1.5">
            {(goalsByMesocycle.get(m.id) ?? []).map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 p-2.5"
                style={{ background: "var(--dc-surface)" }}
              >
                <input
                  type="checkbox"
                  checked={g.achievedAt != null}
                  disabled={isPending}
                  onChange={(e) => toggle(g.id, e.target.checked)}
                  aria-label="Als erreicht markieren"
                />
                {editingId === g.id ? (
                  <>
                    <input
                      className="input flex-1"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                    />
                    <button type="button" className="btn btn-ghost shrink-0" disabled={isPending} onClick={() => saveEdit(g.id)}>
                      Speichern
                    </button>
                    <button type="button" className="btn btn-ghost shrink-0" onClick={() => setEditingId(null)}>
                      Abbrechen
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="min-w-0 flex-1 truncate text-[14px]"
                      style={{ textDecoration: g.achievedAt ? "line-through" : "none", opacity: g.achievedAt ? 0.6 : 1 }}
                    >
                      {g.text}
                    </span>
                    <button type="button" className="btn btn-ghost shrink-0" onClick={() => startEdit(g)}>
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost shrink-0"
                      disabled={isPending}
                      onClick={() => remove(g.id)}
                      aria-label="Ziel löschen"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
