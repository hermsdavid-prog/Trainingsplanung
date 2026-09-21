"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMesocycleGoalAction } from "@/lib/actions/mesocycle-goals";

export type MesocycleGoal = { id: string; text: string; achievedAt: string | null };

// The athlete's own read (mostly) view of their Trainingsziele for one
// Mesozyklus — a checkbox to mark a goal achieved, nothing else (adding/
// editing/removing goals is the trainer's job, see src/components/athletes/goal-list.tsx).
export function GoalToggleList({ goals }: { goals: MesocycleGoal[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (goals.length === 0) return null;

  function toggle(id: string, next: boolean) {
    startTransition(async () => {
      await toggleMesocycleGoalAction(id, next);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: "var(--dc-divider)" }}>
      <div className="kicker-muted">Trainingsziele</div>
      {goals.map((g) => (
        <label key={g.id} className="flex items-center gap-2 text-[13px]" style={{ opacity: g.achievedAt ? 0.6 : 1 }}>
          <input
            type="checkbox"
            checked={g.achievedAt != null}
            disabled={isPending}
            onChange={(e) => toggle(g.id, e.target.checked)}
          />
          <span style={{ textDecoration: g.achievedAt ? "line-through" : "none" }}>{g.text}</span>
        </label>
      ))}
    </div>
  );
}
