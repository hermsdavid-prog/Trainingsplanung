"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateCompact, formatDateLabel } from "@/lib/date";
import { ABSENCE_REASONS, formatTimeRange } from "@/lib/attendance";
import { setOwnAbsenceAction } from "@/lib/actions/attendance";

type Item = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  kind: string;
  note: string | null;
  absent: boolean;
  // Marked absent by the trainer: only the trainer can undo it.
  selfReported: boolean;
  reason: string | null;
};

type Change = { id: string; absent: boolean; reason: string | null };

export function AttendanceSignoffList({ sessions, today }: { sessions: Item[]; today: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setOptimistic] = useOptimistic(sessions, (state, change: Change) =>
    state.map((s) => (s.id === change.id ? { ...s, absent: change.absent, reason: change.reason, selfReported: true } : s))
  );
  // The session whose sign-off form (optional reason) is open.
  const [formId, setFormId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function submit(item: Item, absent: boolean, withReason: string | null) {
    setFormId(null);
    startTransition(async () => {
      setOptimistic({ id: item.id, absent, reason: absent ? withReason : null });
      const result = await setOwnAbsenceAction(item.id, absent, withReason ?? undefined);
      if (result.error) toast.error(result.error);
      else toast.success(absent ? "Du bist abgemeldet." : "Schön, du bist wieder dabei.");
      router.refresh();
    });
  }

  function openForm(item: Item) {
    setReason(item.reason ?? "");
    setFormId(item.id);
  }

  if (items.length === 0) {
    return (
      <div className="mt-2.5 p-3.5 text-[13px] text-muted" style={{ background: "var(--dc-surface)" }}>
        In den nächsten 7 Tagen ist kein Training eingetragen.
      </div>
    );
  }

  return (
    <div className="mt-2.5 flex flex-col gap-1.5">
      {items.map((s) => {
        const weekday = formatDateLabel(s.date).split(",")[0];
        const lockedByTrainer = s.absent && !s.selfReported;
        const formOpen = formId === s.id;
        return (
          <div key={s.id} className="px-3.5 py-2.5" style={{ background: "var(--dc-surface)" }}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px]">
                  <span className="capitalize">{s.date === today ? "Heute" : weekday}</span>, {formatDateCompact(s.date)} ·{" "}
                  <span className="tabular-nums">{formatTimeRange(s.start_time, s.end_time)}</span>
                </div>
                <div className="mt-0.5 text-xs" style={{ color: s.absent ? "var(--dc-accent-2-700)" : "var(--dc-muted)" }}>
                  {s.absent ? (lockedByTrainer ? "Vom Trainer als abwesend eingetragen" : "Abgemeldet") : "Du bist dabei"}
                  {s.absent && s.reason ? ` (${s.reason})` : ""}
                  {s.kind === "extra" ? " · Zusatztraining" : ""}
                  {s.note ? ` · ${s.note}` : ""}
                </div>
              </div>
              {!lockedByTrainer && !formOpen && (
                <div className="flex flex-none flex-col items-end">
                  <button
                    type="button"
                    className={s.absent ? "btn btn-secondary" : "btn btn-ghost"}
                    onClick={() => (s.absent ? submit(s, false, null) : openForm(s))}
                  >
                    {s.absent ? "Doch dabei" : "Abmelden"}
                  </button>
                  {s.absent && (
                    <button type="button" className="mt-0.5 text-xs underline" style={{ color: "var(--dc-muted)" }} onClick={() => openForm(s)}>
                      {s.reason ? "Grund ändern" : "Grund angeben"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {formOpen && (
              <div className="mt-2.5">
                <div className="text-xs text-muted">Grund (freiwillig)</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ABSENCE_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="chip"
                      aria-pressed={reason === r}
                      onClick={() => setReason(reason === r ? "" : r)}
                      style={reason === r ? { background: "var(--dc-accent)", color: "var(--dc-on-accent)", borderColor: "var(--dc-accent)" } : undefined}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  className="input mt-2"
                  maxLength={200}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="oder eigener Grund, z. B. Klassenfahrt"
                  aria-label="Grund der Abmeldung (freiwillig)"
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => submit(s, true, reason.trim() || null)}>
                    {s.absent ? "Speichern" : "Abmelden"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setFormId(null)}>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
