"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateMesocycleGoalTextAction,
  deleteMesocycleGoalAction,
  toggleMesocycleGoalAction,
} from "@/lib/actions/mesocycle-goals";

export type TrainerGoal = { id: string; text: string; achievedAt: string | null; selfAuthored: boolean };

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
                className="flex items-start gap-2 p-2.5"
                style={{ background: "var(--dc-surface)" }}
              >
                <input
                  type="checkbox"
                  className="mt-[4px] flex-none"
                  checked={g.achievedAt != null}
                  disabled={isPending}
                  onChange={(e) => toggle(g.id, e.target.checked)}
                  aria-label="Als erreicht markieren"
                />
                {editingId === g.id ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <textarea
                      className="input"
                      rows={3}
                      maxLength={300}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{ resize: "vertical", minHeight: 80 }}
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary" disabled={isPending} onClick={() => saveEdit(g.id)}>
                        Speichern
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Wraps instead of truncating, so a long goal is readable
                        without opening the editor. */}
                    <span
                      className="min-w-0 flex-1 whitespace-pre-wrap text-[14px] leading-[1.45]"
                      style={{
                        overflowWrap: "anywhere",
                        textDecoration: g.achievedAt ? "line-through" : "none",
                        opacity: g.achievedAt ? 0.6 : 1,
                      }}
                    >
                      {g.text}
                      {g.selfAuthored && (
                        <span className="ml-1.5 tag tag-outline" style={{ verticalAlign: "middle" }}>
                          vom Athleten
                        </span>
                      )}
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
