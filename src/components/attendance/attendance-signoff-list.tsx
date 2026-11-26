"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateCompact, formatDateLabel } from "@/lib/date";
import { formatTimeRange } from "@/lib/attendance";
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
};

export function AttendanceSignoffList({ sessions, today }: { sessions: Item[]; today: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setOptimistic] = useOptimistic(sessions, (state, change: { id: string; absent: boolean }) =>
    state.map((s) => (s.id === change.id ? { ...s, absent: change.absent, selfReported: true } : s))
  );

  function toggle(item: Item) {
    const absent = !item.absent;
    startTransition(async () => {
      setOptimistic({ id: item.id, absent });
      const result = await setOwnAbsenceAction(item.id, absent);
      if (result.error) toast.error(result.error);
      else toast.success(absent ? "Du bist abgemeldet." : "Schön, du bist wieder dabei.");
      router.refresh();
    });
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
        return (
          <div key={s.id} className="flex items-center gap-3 px-3.5 py-2.5" style={{ background: "var(--dc-surface)" }}>
            <div className="min-w-0 flex-1">
              <div className="text-[15px]">
                <span className="capitalize">{s.date === today ? "Heute" : weekday}</span>, {formatDateCompact(s.date)} ·{" "}
                <span className="tabular-nums">{formatTimeRange(s.start_time, s.end_time)}</span>
              </div>
              <div className="mt-0.5 text-xs" style={{ color: s.absent ? "var(--dc-accent-2-700)" : "var(--dc-muted)" }}>
                {s.absent ? (lockedByTrainer ? "Vom Trainer als abwesend eingetragen" : "Abgemeldet") : "Du bist dabei"}
                {s.kind === "extra" ? " · Zusatztraining" : ""}
                {s.note ? ` · ${s.note}` : ""}
              </div>
            </div>
            {!lockedByTrainer && (
              <button type="button" className={s.absent ? "btn btn-secondary flex-none" : "btn btn-ghost flex-none"} onClick={() => toggle(s)}>
                {s.absent ? "Doch dabei" : "Abmelden"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
