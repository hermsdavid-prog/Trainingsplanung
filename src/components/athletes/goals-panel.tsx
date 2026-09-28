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
    <div className="mt-4 mb-6" style={{ background: "var(--dc-surface)" }}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3"
        style={{ background: "transparent", border: 0, cursor: "pointer", textAlign: "left", color: "var(--dc-text)" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-[15px]">
          Meine Ziele{" "}
          <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
            · {totalCount} {totalCount === 1 ? "Ziel" : "Ziele"}
          </span>
        </span>
        <span style={{ color: "var(--dc-accent-700)" }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 px-3.5 pb-3.5">
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
