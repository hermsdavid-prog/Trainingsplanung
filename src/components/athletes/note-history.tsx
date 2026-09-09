"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAthleteNoteAction } from "@/lib/actions/athlete-notes";

export type SentNote = {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  trainerName: string;
};

// The trainer's own history of notes sent to the selected athlete, with a
// delete option — the athlete has the matching option on their own
// dashboard via CoachNotesBanner.
export function NoteHistory({ notes }: { notes: SentNote[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (notes.length === 0) return null;

  function remove(id: string) {
    startTransition(async () => {
      await deleteAthleteNoteAction(id);
      router.refresh();
    });
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      {notes.map((n) => (
        <div
          key={n.id}
          className="flex items-start justify-between gap-3 p-3"
          style={{ background: "var(--dc-surface)", borderLeft: n.read ? "2px solid var(--dc-divider)" : "2px solid var(--dc-accent)" }}
        >
          <div className="min-w-0">
            <p className="text-[14px] leading-[1.5]">{n.message}</p>
            <p className="mt-1 text-xs text-muted">
              {n.trainerName} · {new Date(n.createdAt).toLocaleDateString("de-DE")}
              {n.read ? " · gelesen" : " · ungelesen"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost shrink-0"
            disabled={isPending}
            onClick={() => remove(n.id)}
            aria-label="Nachricht löschen"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
