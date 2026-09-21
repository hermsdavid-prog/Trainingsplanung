"use client";

import { useState } from "react";
import { GoalToggleList, type MesocycleGoal } from "@/components/mesocycles/goal-toggle-list";

export type MesocycleGoalGroup = { mesocycleId: string; mesocycleTitle: string; goals: MesocycleGoal[] };

// Collapsible "Ziele" button on the athlete's Startseite — same pattern as
// ReadinessPanel on the trainer dashboard — so the day's training isn't
// pushed down by a list that's usually short and doesn't change often.
// Reuses GoalToggleList (toggle achieved, add/remove an own goal) per
// Mesozyklus, just labeled by Mesozyklus name instead of its own generic
// "Trainingsziele" heading since that's already the panel's own title.
export function GoalsPanel({ groups, athleteId }: { groups: MesocycleGoalGroup[]; athleteId: string }) {
  const totalCount = groups.reduce((sum, g) => sum + g.goals.length, 0);
  const [open, setOpen] = useState(false);

  if (groups.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        type="button"
        className="kicker-muted flex w-full items-center justify-between gap-2"
        style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Ziele ({totalCount})</span>
        <span>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4">
          {groups.map((g) => (
            <GoalToggleList
              key={g.mesocycleId}
              goals={g.goals}
              mesocycleId={g.mesocycleId}
              athleteId={athleteId}
              heading={g.mesocycleTitle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
