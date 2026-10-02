"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { handleAthleteHintAction } from "@/lib/actions/athlete-notes";
import { formatDateShort } from "@/lib/date";

export type AthleteHint = {
  feedbackId: string;
  athleteId: string;
  athleteName: string;
  planId: string;
  planTitle: string;
  planDate: string;
  exercise: string;
  note: string;
};

// Hints athletes left during a session ("Schmerzen im Knie"). Each can be
// answered (sent to the athlete as a trainer note) and/or marked as done,
// so the list only shows what still needs attention.
export function AthleteHints({ hints }: { hints: AthleteHint[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();

  const open = hints.filter((h) => !done.has(h.feedbackId));
  if (open.length === 0) return null;

  function handle(h: AthleteHint, withReply: boolean) {
    startTransition(async () => {
      const result = await handleAthleteHintAction(h.feedbackId, h.athleteId, withReply ? reply : undefined);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDone((prev) => new Set(prev).add(h.feedbackId));
      setReplyFor(null);
      setReply("");
      toast.success(withReply ? `Antwort an ${h.athleteName} gesendet.` : "Als erledigt markiert.");
    });
  }

  return (
    <div className="mt-6 p-3.5" style={{ background: "var(--dc-accent-100)" }}>
      <div className="kicker">💬 Hinweise von Athleten · offen ({open.length})</div>
      <div className="mt-2 flex flex-col gap-3">
        {open.map((h) => (
          <div key={h.feedbackId}>
            <Link
              href={`/trainer/plans/${h.planId}/athlete/${h.athleteId}`}
              className="block no-underline"
              style={{ color: "inherit" }}
            >
              <div className="text-[14px] leading-[1.45]" style={{ overflowWrap: "anywhere" }}>
                <strong>{h.athleteName}</strong> · {h.exercise}: {h.note}
              </div>
              <div className="text-xs" style={{ color: "var(--dc-muted)" }}>
                {h.planTitle}
                {h.planDate ? ` · ${formatDateShort(h.planDate)}` : ""}
              </div>
            </Link>
            {replyFor === h.feedbackId ? (
              <div className="mt-2">
                <textarea
                  className="input"
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Antwort an ${h.athleteName}`}
                  maxLength={500}
                  autoFocus
                />
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isPending || !reply.trim()}
                    onClick={() => handle(h, true)}
                  >
                    Senden und erledigt
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setReplyFor(null)}>
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setReplyFor(h.feedbackId);
                    setReply("");
                  }}
                >
                  Antworten
                </button>
                <button type="button" className="btn btn-ghost" disabled={isPending} onClick={() => handle(h, false)}>
                  ✓ Erledigt
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
