"use client";

import { useState } from "react";

export type OverviewKraft = {
  id: string;
  name: string;
  spec: string;
  sets: string;
  restLabel: string;
  exerciseId: string | null;
};

export type OverviewCardio = {
  id: string;
  name: string;
  spec: string;
  restLabel: string;
  on: string;
  off: string;
};

export type OverviewKarateRow = {
  id: string;
  name: string;
  desc: string;
  rounds: string;
  restLabel: string;
  valLabel: string;
  exerciseId: string | null;
};

type Instructions = { steps: string[]; video_url: string | null; video_label: string | null };

// A trainer-facing, read-only counterpart to the athlete's WorkoutSession —
// same clean per-exercise card layout so a coach can glance at what's
// coming up during a session, but with no set-logging/RPE inputs at all
// (trainers don't enter reps/weight for their own reference view).
export function WorkoutOverview({
  isAthletik,
  kraft,
  cardio,
  karateRows,
  instructionsByExercise,
}: {
  isAthletik: boolean;
  kraft: OverviewKraft[];
  cardio: OverviewCardio[];
  karateRows: OverviewKarateRow[];
  instructionsByExercise: Record<string, Instructions>;
}) {
  const [instrId, setInstrId] = useState<string | null>(null);

  const instrExercise = isAthletik
    ? kraft.find((e) => e.id === instrId)
    : karateRows.find((r) => r.id === instrId);
  const instrExerciseId =
    isAthletik
      ? kraft.find((e) => e.id === instrId)?.exerciseId
      : karateRows.find((r) => r.id === instrId)?.exerciseId;
  const instr = instrExerciseId ? instructionsByExercise[instrExerciseId] : undefined;

  return (
    <div>
      {isAthletik ? (
        <>
          {kraft.length > 0 && (
            <>
              <div className="kicker-muted">Kraft</div>
              <div className="mt-3 flex flex-col gap-2.5">
                {kraft.map((ex) => (
                  <div key={ex.id} className="p-3.5" style={{ background: "var(--dc-surface)" }}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <div className="text-[16px] leading-[1.25]">{ex.name}</div>
                        <div className="mt-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                          {ex.spec || "—"}
                          {ex.sets ? ` · ${ex.sets} Sätze` : ""}
                          {ex.restLabel ? ` · Pause ${ex.restLabel}` : ""}
                        </div>
                      </div>
                      {ex.exerciseId && instructionsByExercise[ex.exerciseId]?.steps.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setInstrId(ex.id)}
                          aria-label="Anweisung anzeigen"
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[15px]"
                          style={{ border: "1px solid var(--dc-accent)", color: "var(--dc-accent-700)" }}
                        >
                          i
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {cardio.length > 0 && (
            <>
              <div className="kicker-accent-2 mt-6.5">Cardio</div>
              <div className="mt-3 flex flex-col gap-2.5">
                {cardio.map((c) => (
                  <div key={c.id} className="p-3.5" style={{ background: "var(--dc-surface)" }}>
                    <div className="text-[16px] leading-[1.25]">{c.name}{c.spec ? ` — ${c.spec}` : ""}</div>
                    <div className="mt-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                      {c.on && `On ${c.on} Belastung`}
                      {c.off && ` · Off ${c.off} Pause`}
                      {c.restLabel && ` · Pause ${c.restLabel}`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {kraft.length === 0 && cardio.length === 0 && (
            <p className="text-sm text-muted">Für diesen Plan wurden noch keine Übungen eingetragen.</p>
          )}
        </>
      ) : (
        <>
          {karateRows.length === 0 ? (
            <p className="text-sm text-muted">Für diesen Plan wurden noch keine Übungen eingetragen.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {karateRows.map((row) => (
                <div key={row.id} className="p-3.5" style={{ background: "var(--dc-surface)" }}>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="text-[16px] leading-[1.25]">{row.name}</div>
                      <div className="mt-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                        {row.valLabel || "—"}
                        {row.rounds ? ` · ${row.rounds} Runden` : ""}
                        {row.restLabel ? ` · Pause ${row.restLabel}` : ""}
                      </div>
                    </div>
                    {row.exerciseId && instructionsByExercise[row.exerciseId]?.steps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setInstrId(row.id)}
                        aria-label="Anweisung anzeigen"
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[15px]"
                        style={{ border: "1px solid var(--dc-accent)", color: "var(--dc-accent-700)" }}
                      >
                        i
                      </button>
                    )}
                  </div>
                  {row.desc && <div className="mt-1.5 text-[13px] leading-[1.5]">{row.desc}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {instrId && instr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: "color-mix(in srgb, #201e1d 50%, transparent)" }}
          onClick={() => setInstrId(null)}
        >
          <div
            className="w-full max-w-[440px] max-h-full overflow-y-auto p-5.5"
            style={{ background: "var(--dc-bg)", boxShadow: "var(--dc-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="kicker">Anweisung</div>
                <div className="mt-1.5 text-[21px] leading-[1.15]">{instrExercise?.name}</div>
              </div>
              <button
                type="button"
                aria-label="Schließen"
                onClick={() => setInstrId(null)}
                className="-mr-2 -mt-2 h-10 w-10 text-lg"
                style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}
              >
                ✕
              </button>
            </div>
            <div className="mt-3.5">
              {instr.steps.map((s, i) => (
                <div
                  key={i}
                  className="grid items-baseline gap-2.5 py-2"
                  style={{ gridTemplateColumns: "22px 1fr", borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 8%, transparent)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--dc-accent)" }}>
                    {i + 1}
                  </span>
                  <span className="text-[15px] leading-[1.45]">{s}</span>
                </div>
              ))}
            </div>
            {instr.video_url && (
              <a
                href={instr.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-between gap-3 p-3.5 no-underline"
                style={{ background: "var(--dc-surface)", borderLeft: "2px solid var(--dc-accent)" }}
              >
                <span className="text-sm" style={{ color: "var(--dc-text)" }}>
                  {instr.video_label || "Video ansehen"}
                </span>
                <span className="text-[17px]" style={{ color: "var(--dc-accent-700)" }}>▸</span>
              </a>
            )}
            <button type="button" className="btn btn-primary btn-block mt-4.5" onClick={() => setInstrId(null)}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
