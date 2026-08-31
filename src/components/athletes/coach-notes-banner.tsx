"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAthleteNoteReadAction } from "@/lib/actions/athlete-notes";

export type CoachNote = {
  id: string;
  message: string;
  createdAt: string;
  trainerName: string;
};

// Unread heads-up from a trainer — e.g. "your readiness dropped, go easy
// today" — surfaced right at the top of the athlete's dashboard, above even
// the health check-in, so it can't be missed.
export function CoachNotesBanner({ notes }: { notes: CoachNote[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (notes.length === 0) return null;

  function markRead(id: string) {
    startTransition(async () => {
      await markAthleteNoteReadAction(id);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {notes.map((n) => (
        <div key={n.id} className="p-3.5" style={{ background: "var(--dc-accent-100)", borderLeft: "2px solid var(--dc-accent)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="kicker">Hinweis von {n.trainerName}</div>
              <p className="mt-1 text-[14px] leading-[1.5]">{n.message}</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              disabled={isPending}
              onClick={() => markRead(n.id)}
              aria-label="Als gelesen markieren"
            >
              ✓ gelesen
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
