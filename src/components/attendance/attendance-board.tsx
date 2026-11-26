"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateCompact, formatDateLabel } from "@/lib/date";
import { formatTimeRange, type AttendanceAbsence, type AttendanceSession } from "@/lib/attendance";
import { createExtraSessionAction, setAbsenceAction, setSessionCancelledAction } from "@/lib/actions/attendance";

type Member = { id: string; full_name: string };

export function AttendanceBoard({
  rosterId,
  today,
  weekStart,
  members,
  sessions,
  absences,
}: {
  rosterId: string;
  today: string;
  weekStart: string;
  members: Member[];
  sessions: AttendanceSession[];
  absences: AttendanceAbsence[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Default: today's session (or the first of the week) is open.
  const [openId, setOpenId] = useState<string | null>(
    () => sessions.find((s) => s.date === today && !s.cancelled_at)?.id ?? null
  );
  // Optimistic absences: key "session:athlete" → absent?
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [extra, setExtra] = useState({ date: weekStart < today ? today : weekStart, start: "18:00", end: "19:30", note: "" });

  const absenceOf = (sessionId: string, athleteId: string) => {
    const key = `${sessionId}:${athleteId}`;
    if (key in pending) return pending[key] ? { self_reported: false } : null;
    return absences.find((a) => a.session_id === sessionId && a.athlete_id === athleteId) ?? null;
  };

  function toggle(sessionId: string, athleteId: string) {
    const nowAbsent = !absenceOf(sessionId, athleteId);
    const key = `${sessionId}:${athleteId}`;
    setPending((p) => ({ ...p, [key]: nowAbsent }));
    startTransition(async () => {
      const result = await setAbsenceAction(sessionId, athleteId, nowAbsent);
      if (result.error) toast.error(result.error);
      router.refresh();
      setPending((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    });
  }

  function setCancelled(session: AttendanceSession, cancelled: boolean) {
    const label = `${formatDateLabel(session.date)}, ${formatTimeRange(session.start_time, session.end_time)}`;
    if (cancelled && !confirm(`Training am ${label} entfernen? Es zählt dann nicht mehr für die Anwesenheit.`)) return;
    startTransition(async () => {
      const result = await setSessionCancelledAction(session.id, cancelled);
      if (result.error) toast.error(result.error);
      else toast.success(cancelled ? "Training entfernt." : "Training wiederhergestellt.");
      router.refresh();
    });
  }

  function createExtra() {
    startTransition(async () => {
      const result = await createExtraSessionAction({ rosterId, ...extra });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Training angelegt.");
      setFormOpen(false);
      setExtra((e) => ({ ...e, note: "" }));
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      {sessions.length === 0 && <p className="text-sm text-muted">In dieser Woche gibt es keine Trainings.</p>}

      <div className="flex flex-col gap-2.5">
        {sessions.map((s) => {
          const cancelled = !!s.cancelled_at;
          const absentCount = cancelled ? 0 : members.filter((m) => absenceOf(s.id, m.id)).length;
          const open = openId === s.id && !cancelled;
          const future = s.date > today;
          return (
            <div key={s.id} style={{ background: "var(--dc-surface)", opacity: cancelled ? 0.6 : 1 }}>
              <div className="flex items-center gap-3 p-3.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => !cancelled && setOpenId(open ? null : s.id)}
                  aria-expanded={open}
                  disabled={cancelled}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-semibold capitalize" style={{ textDecoration: cancelled ? "line-through" : undefined }}>
                      {formatDateLabel(s.date).split(",")[0]}, {formatDateCompact(s.date)}
                    </span>
                    <span className="text-sm tabular-nums">{formatTimeRange(s.start_time, s.end_time)}</span>
                    {s.date === today && !cancelled && <span className="tag tag-accent">Heute</span>}
                    {s.kind === "extra" && <span className="tag tag-outline">Zusatztraining</span>}
                    {cancelled && <span className="tag tag-neutral">Entfernt</span>}
                  </div>
                  {s.note && <div className="mt-0.5 text-xs text-muted">{s.note}</div>}
                  {!cancelled && (
                    <div className="mt-0.5 text-xs text-muted">
                      {members.length - absentCount} von {members.length} {future ? "dabei" : "anwesend"}
                      {absentCount > 0 && ` · ${absentCount} ${future ? "abgemeldet" : "abwesend"}`}
                    </div>
                  )}
                </button>
                {cancelled ? (
                  <button type="button" className="btn btn-ghost flex-none" disabled={isPending} onClick={() => setCancelled(s, false)}>
                    Wiederherstellen
                  </button>
                ) : (
                  <span aria-hidden className="flex-none text-muted">{open ? "▴" : "▾"}</span>
                )}
              </div>

              {open && (
                <div className="px-3.5 pb-3.5">
                  <div className="flex flex-col">
                    {members.map((m) => {
                      const absence = absenceOf(s.id, m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggle(s.id, m.id)}
                          className="flex min-h-[44px] items-center gap-3 py-1.5 text-left"
                          style={{ borderTop: "1px solid var(--dc-divider)" }}
                          aria-pressed={!absence}
                          aria-label={`${m.full_name}: ${absence ? "abwesend" : "anwesend"}, tippen zum Ändern`}
                        >
                          <span
                            aria-hidden
                            className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[14px] font-semibold"
                            style={
                              absence
                                ? { border: "1.5px solid var(--dc-accent-2-500)", color: "var(--dc-accent-2-700)" }
                                : { background: "var(--dc-accent)", color: "var(--dc-on-accent)" }
                            }
                          >
                            {absence ? "✕" : "✓"}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[15px]" style={{ color: absence ? "var(--dc-muted)" : undefined }}>
                            {m.full_name}
                          </span>
                          {absence && (
                            <span className="flex-none text-xs" style={{ color: "var(--dc-accent-2-700)" }}>
                              {absence.self_reported ? "hat sich abgemeldet" : "abwesend"}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost mt-2"
                    style={{ color: "var(--dc-accent-2-700)" }}
                    disabled={isPending}
                    onClick={() => setCancelled(s, true)}
                  >
                    Training entfernen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        {!formOpen ? (
          <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(true)}>
            + Zusätzliches Training
          </button>
        ) : (
          <div className="max-w-[560px] p-4" style={{ background: "var(--dc-surface)" }}>
            <div className="kicker-muted">Zusätzliches Training</div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div className="field col-span-2 sm:col-span-1">
                <label htmlFor="att-date">Datum</label>
                <input id="att-date" type="date" className="input" value={extra.date} onChange={(e) => setExtra({ ...extra, date: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="att-start">Beginn</label>
                <input id="att-start" type="time" className="input" value={extra.start} onChange={(e) => setExtra({ ...extra, start: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="att-end">Ende</label>
                <input id="att-end" type="time" className="input" value={extra.end} onChange={(e) => setExtra({ ...extra, end: e.target.value })} />
              </div>
            </div>
            <div className="field mt-3">
              <label htmlFor="att-note">Hinweis (optional)</label>
              <input
                id="att-note"
                className="input"
                maxLength={200}
                value={extra.note}
                placeholder="z. B. Lehrgang, Ersatztermin"
                onChange={(e) => setExtra({ ...extra, note: e.target.value })}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn btn-primary" disabled={isPending || !extra.date} onClick={createExtra}>
                {isPending ? "Wird angelegt…" : "Training anlegen"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
