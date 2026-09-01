"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  upsertExerciseResultAction,
  deleteExerciseResultSetAction,
} from "@/lib/actions/exercise-results";
import { saveSessionRpeAction } from "@/lib/actions/sessions";
import type { BadgeAward } from "@/lib/badges";

type SetType = "aufwaermsatz" | "arbeitssatz";

type SessionSet = {
  key: string;
  setNumber: number;
  type: SetType;
  reps: string;
  weight: string;
  rir: string;
  confirmed: boolean;
};

type ExerciseInstructions = {
  short_summary: string | null;
  watch_note: string | null;
  steps: string[];
  video_url: string | null;
  video_label: string | null;
};

export type SessionExercise = {
  itemId: string;
  exerciseId: string | null;
  name: string;
  spec: string;
  sets: string;
  restLabel: string;
  restSeconds: number;
  note: string;
  unit: string;
  initialSets: { setNumber: number; type: SetType; reps: string; weight: string; rir: string }[];
};

export type SessionCardio = {
  itemId: string;
  name: string;
  spec: string;
  restLabel: string;
  on: string;
  off: string;
  note: string;
};

export type SessionKarateRow = {
  itemId: string;
  name: string;
  desc: string;
  rounds: number;
  restLabel: string;
  valLabel: string;
};

function parseLeadingNumber(label: string): string {
  const m = label.match(/\d+([.,]\d+)?/);
  return m ? m[0].replace(",", ".") : "";
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function notifyNewBadges(badges: BadgeAward[] | undefined) {
  for (const badge of badges ?? []) {
    toast.success(`${badge.icon} ${badge.title}`, { description: badge.description });
  }
}

const SET_TYPE_LABEL: Record<SetType, string> = {
  aufwaermsatz: "Aufwärmsatz",
  arbeitssatz: "Arbeitssatz",
};

const RPE_WORDS: Record<number, string> = {
  1: "sehr leicht",
  2: "sehr leicht",
  3: "leicht",
  4: "moderat",
  5: "moderat",
  6: "anstrengend",
  7: "anstrengend",
  8: "sehr anstrengend",
  9: "maximal",
  10: "maximal",
};

let uid = 0;
function nextKey() {
  uid += 1;
  return `s${uid}`;
}

export function WorkoutSession({
  planId,
  planDate,
  planTitle,
  planKicker,
  backHref,
  categoryLabel,
  exercises,
  cardio,
  karateRows,
  instructionsByExercise,
  initialRpe,
  lastKnownByExercise = {},
}: {
  planId: string;
  planDate: string;
  planTitle: string;
  planKicker: string;
  backHref: string;
  categoryLabel: string;
  exercises: SessionExercise[];
  cardio: SessionCardio[];
  karateRows: SessionKarateRow[];
  instructionsByExercise: Record<string, ExerciseInstructions>;
  initialRpe: number | null;
  lastKnownByExercise?: Record<string, { weight: string; reps: string }>;
}) {
  const isAthletik = categoryLabel.trim().toLowerCase() === "athletik";
  const router = useRouter();

  // A saved RPE means this training was already ended in an earlier visit —
  // land back on a compact "abgeschlossen" summary instead of jumping
  // straight into live entry, with an explicit opt-in to keep editing.
  const [editMode, setEditMode] = useState(initialRpe === null);

  const [setsByItem, setSetsByItem] = useState<Record<string, SessionSet[]>>(() => {
    const map: Record<string, SessionSet[]> = {};
    for (const ex of exercises) {
      const confirmedSets: SessionSet[] = ex.initialSets.map((s) => ({
        key: nextKey(),
        setNumber: s.setNumber,
        type: s.type,
        reps: s.reps,
        weight: s.weight,
        rir: s.rir,
        confirmed: true,
      }));
      const suggested = Number(ex.sets) || 1;
      const rows = [...confirmedSets];
      let nextSetNumber = rows.reduce((m, r) => Math.max(m, r.setNumber), 0) + 1;
      // The first set prepared for a fresh exercise is always a warm-up, not
      // a work set — matches how a lift is actually approached (ramp up,
      // then work sets), and the athlete can still add/remove either kind
      // freely from there via the existing +Aufwärmsatz/+Arbeitssatz buttons.
      for (let i = rows.length; i < suggested; i++) {
        rows.push({
          key: nextKey(),
          setNumber: nextSetNumber++,
          type: rows.length === 0 ? "aufwaermsatz" : "arbeitssatz",
          reps: parseLeadingNumber(ex.spec),
          weight: "",
          rir: "",
          confirmed: false,
        });
      }
      map[ex.itemId] = rows;
    }
    return map;
  });

  const [activeItemId, setActiveItemId] = useState<string>(exercises[0]?.itemId ?? "");

  const [restRemaining, setRestRemaining] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (restRemaining <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setRestRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restRemaining > 0]);

  const [pad, setPad] = useState<{
    itemId: string;
    setKey: string;
    field: "reps" | "weight";
    buffer: string;
    unit: string;
    step: number;
    suggestion?: string;
  } | null>(null);

  // RIR ("Reps in Reserve") is asked per work set right after it's logged —
  // MacroFactor-style per-set feedback, separate from the end-of-session
  // RPE below. A small fixed picker (not the numeric pad) since it's always
  // one of a handful of values.
  const [rirPad, setRirPad] = useState<{ itemId: string; setKey: string } | null>(null);

  const [instrItemId, setInstrItemId] = useState<string | null>(null);
  const [rpeOpen, setRpeOpen] = useState(false);
  const [rpeValue, setRpeValue] = useState<number | null>(initialRpe);
  const [isSavingRpe, setIsSavingRpe] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const activeExercise = exercises.find((e) => e.itemId === activeItemId) ?? exercises[0];
  const activeSets = activeExercise ? setsByItem[activeExercise.itemId] ?? [] : [];

  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    let tonnage = 0;
    let tonnageUnit = "kg";
    for (const ex of exercises) {
      const rows = setsByItem[ex.itemId] ?? [];
      const suggested = Number(ex.sets) || 1;
      total += Math.max(suggested, rows.length);
      for (const r of rows) {
        if (!r.confirmed) continue;
        done += 1;
        if (r.type === "arbeitssatz") {
          const w = Number(r.weight.replace(",", "."));
          const reps = Number(r.reps.replace(",", "."));
          if (Number.isFinite(w) && Number.isFinite(reps)) {
            tonnage += w * reps;
            tonnageUnit = ex.unit || tonnageUnit;
          }
        }
      }
    }
    return { total, done, tonnage: Math.round(tonnage), tonnageUnit };
  }, [exercises, setsByItem]);

  const progressWidth = totals.total > 0 ? `${Math.min(100, (totals.done / totals.total) * 100)}%` : "0%";

  function updateSet(itemId: string, key: string, field: "reps" | "weight" | "rir", value: string) {
    setSetsByItem((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((s) => (s.key === key ? { ...s, [field]: value } : s)),
    }));
  }

  function addSet(itemId: string, type: SetType) {
    setSetsByItem((prev) => {
      const rows = prev[itemId] ?? [];
      const maxSetNumber = rows.reduce((m, r) => Math.max(m, r.setNumber), 0);
      return {
        ...prev,
        [itemId]: [
          ...rows,
          { key: nextKey(), setNumber: maxSetNumber + 1, type, reps: "", weight: "", rir: "", confirmed: false },
        ],
      };
    });
  }

  async function removeSet(ex: SessionExercise, set: SessionSet) {
    if (set.confirmed) {
      if (!ex.exerciseId) return;
      setPendingKey(set.key);
      const result = await deleteExerciseResultSetAction(ex.exerciseId, planDate, set.setNumber);
      setPendingKey(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
    }
    setSetsByItem((prev) => ({
      ...prev,
      [ex.itemId]: prev[ex.itemId].filter((s) => s.key !== set.key),
    }));
  }

  async function confirmSet(ex: SessionExercise, set: SessionSet) {
    if (!ex.exerciseId) {
      toast.error("Diese Übung ist nicht in der Übungsbibliothek verknüpft.");
      return;
    }
    const weight = Number(set.weight.replace(",", "."));
    if (!set.weight.trim() || Number.isNaN(weight)) {
      toast.error("Bitte ein Gewicht eintragen.");
      return;
    }
    const reps = set.reps.trim() ? Number(set.reps.replace(",", ".")) : null;
    const rir = set.type === "arbeitssatz" && set.rir.trim() ? Number(set.rir) : null;
    setPendingKey(set.key);
    const result = await upsertExerciseResultAction(
      ex.exerciseId,
      planDate,
      set.setNumber,
      weight,
      reps,
      ex.unit || "kg",
      planId,
      set.type,
      rir
    );
    setPendingKey(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSetsByItem((prev) => ({
      ...prev,
      [ex.itemId]: prev[ex.itemId].map((s) => (s.key === set.key ? { ...s, confirmed: true } : s)),
    }));
    if (ex.restSeconds > 0) {
      setRestRemaining(ex.restSeconds);
    }
    notifyNewBadges(result.newBadges);
  }

  // The field to fill in always starts empty (or with whatever the athlete
  // already entered) — the last-known value is shown only as a reference
  // hint below it, never pre-filled, so nothing gets saved without the
  // athlete actually typing it.
  function openPad(itemId: string, setKey: string, field: "reps" | "weight", current: string, unit: string) {
    const ex = exercises.find((e) => e.itemId === itemId);
    const suggestion = ex?.exerciseId ? lastKnownByExercise[ex.exerciseId] : undefined;
    const suggestedValue = suggestion ? (field === "weight" ? suggestion.weight : suggestion.reps) : undefined;
    setPad({ itemId, setKey, field, buffer: current, unit, step: field === "weight" ? 2.5 : 1, suggestion: suggestedValue });
  }

  function padPress(key: string) {
    if (!pad) return;
    if (key === "⌫") {
      setPad({ ...pad, buffer: pad.buffer.slice(0, -1) });
      return;
    }
    if (key === "," && pad.buffer.includes(",")) return;
    if (pad.buffer.length >= 6) return;
    setPad({ ...pad, buffer: pad.buffer + key });
  }

  function padStepBy(delta: number) {
    if (!pad) return;
    const current = Number(pad.buffer.replace(",", ".")) || 0;
    const next = Math.max(0, current + delta);
    setPad({ ...pad, buffer: String(next).replace(".", ",") });
  }

  // Auto-save: once both weight and reps for a set are filled in (whichever
  // field got typed second), persist immediately instead of requiring a
  // separate tap on ✓ — the manual ✓ button still works for weight-only
  // saves (reps stay optional) and for re-saving a correction afterwards.
  function padSave() {
    if (!pad) return;
    const { itemId, setKey, field, buffer } = pad;
    setPad(null);
    updateSet(itemId, setKey, field, buffer);
    const current = (setsByItem[itemId] ?? []).find((s) => s.key === setKey);
    if (!current) return;
    const updated = { ...current, [field]: buffer };
    if (!updated.confirmed && updated.weight.trim() && updated.reps.trim()) {
      const ex = exercises.find((e) => e.itemId === itemId);
      if (ex) confirmSet(ex, updated);
    }
  }

  // RIR is picked after the set is already logged, so this always re-saves
  // an already-confirmed set (same weight/reps, now with RIR attached).
  async function saveRir(itemId: string, setKey: string, rirValue: string) {
    setRirPad(null);
    updateSet(itemId, setKey, "rir", rirValue);
    const ex = exercises.find((e) => e.itemId === itemId);
    const current = (setsByItem[itemId] ?? []).find((s) => s.key === setKey);
    if (!ex || !current) return;
    await confirmSet(ex, { ...current, rir: rirValue });
  }

  async function handleRpeSave() {
    if (!rpeValue) {
      toast.error("Bitte ein Belastungsempfinden wählen.");
      return;
    }
    setIsSavingRpe(true);
    const result = await saveSessionRpeAction(planId, rpeValue);
    setIsSavingRpe(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Training gespeichert.");
    notifyNewBadges(result.newBadges);
    router.push("/athlete");
  }

  const padKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"];

  return (
    <div className="relative">
      <Link href={backHref} className="btn btn-ghost">
        ← Startseite
      </Link>

      <div className="mt-2.5">
        <div className="kicker">{planKicker}</div>
        <h2 className="mt-1.5 text-[27px] leading-[1.08]">{planTitle}</h2>

        {!editMode && (
          <div className="mt-5">
            <div className="flex items-center gap-2.5 p-4" style={{ background: "var(--dc-surface)" }}>
              <span
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[15px]"
                style={{ background: "#10b981", color: "var(--dc-bg)" }}
              >
                ✓
              </span>
              <div>
                <div className="text-[16px]">Training abgeschlossen</div>
                <div className="mt-0.5 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                  Belastungsempfinden: {rpeValue ?? "—"} / 10
                  {isAthletik && totals.done > 0
                    ? ` · ${totals.done} ${totals.done === 1 ? "Satz" : "Sätze"} dokumentiert`
                    : ""}
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-block mt-3.5" onClick={() => setEditMode(true)}>
              Nachträglich bearbeiten
            </button>
          </div>
        )}

        {editMode && (isAthletik ? (
          <>
            <div className="mt-3.5 flex items-baseline justify-between text-[13px]">
              <span>
                {totals.done} von {totals.total} Sätzen
              </span>
              <span style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                {totals.tonnage > 0 ? `${totals.tonnage.toLocaleString("de-DE")} ${totals.tonnageUnit}` : "—"}
              </span>
            </div>
            <div className="mt-2 h-[3px]" style={{ background: "color-mix(in srgb, var(--dc-text) 12%, transparent)" }}>
              <div className="h-[3px]" style={{ background: "var(--dc-accent)", width: progressWidth }} />
            </div>

            {restRemaining > 0 && (
              <div
                className="mt-3.5 flex items-center justify-between px-3.5 py-2.5"
                style={{ background: "var(--dc-accent-100)" }}
              >
                <span className="text-sm">
                  Pause · <strong>{formatMMSS(restRemaining)}</strong>
                </span>
                <button type="button" className="btn btn-ghost" onClick={() => setRestRemaining(0)}>
                  Überspringen
                </button>
              </div>
            )}

            {activeExercise && (
              <>
                <div className="mt-5.5 flex items-center gap-2.5" style={{ marginTop: 22 }}>
                  <h3 className="m-0 text-[21px]">{activeExercise.name}</h3>
                  <button
                    type="button"
                    onClick={() => setInstrItemId(activeExercise.itemId)}
                    aria-label="Anweisung anzeigen"
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[15px]"
                    style={{ border: "1px solid var(--dc-accent)", color: "var(--dc-accent-700)" }}
                  >
                    i
                  </button>
                </div>
                <div className="mt-1 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                  {activeExercise.spec}
                  {activeExercise.restLabel ? ` · Pause ${activeExercise.restLabel}` : ""}
                  {activeExercise.note ? ` · ${activeExercise.note}` : ""}
                </div>

                <div
                  className="mt-4 grid gap-2 pb-1.5 text-[10px] uppercase"
                  style={{
                    gridTemplateColumns: "64px 1fr 1fr 52px 38px 30px",
                    letterSpacing: ".09em",
                    color: "color-mix(in srgb, var(--dc-text) 55%, transparent)",
                    borderBottom: "1px solid var(--dc-divider)",
                  }}
                >
                  <span>Satz</span>
                  <span>Wdh.</span>
                  <span>Gewicht</span>
                  <span>RIR</span>
                  <span />
                  <span />
                </div>
                {(() => {
                  const typeCounts: Partial<Record<SetType, number>> = {};
                  return activeSets.map((s) => {
                    typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
                    const label = `${SET_TYPE_LABEL[s.type]} ${typeCounts[s.type]}`;
                    const pending = pendingKey === s.key;
                    return (
                      <div
                        key={s.key}
                        className="grid items-center gap-2 py-2.5"
                        style={{
                          gridTemplateColumns: "64px 1fr 1fr 52px 38px 30px",
                          borderBottom: "1px solid color-mix(in srgb, var(--dc-text) 8%, transparent)",
                        }}
                      >
                        <span
                          className="text-xs leading-tight"
                          style={{ color: s.confirmed ? "var(--dc-accent-700)" : "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}
                        >
                          {label}
                        </span>
                        <button
                          type="button"
                          className="tapv text-left text-[19px]"
                          onClick={() => openPad(activeExercise.itemId, s.key, "reps", s.reps, "Wdh.")}
                        >
                          {s.reps || "—"}
                        </button>
                        <button
                          type="button"
                          className="tapv text-left text-[19px]"
                          onClick={() => openPad(activeExercise.itemId, s.key, "weight", s.weight, activeExercise.unit || "kg")}
                        >
                          {s.weight ? `${s.weight} ${activeExercise.unit || "kg"}` : "—"}
                        </button>
                        {s.type === "arbeitssatz" && s.confirmed ? (
                          <button
                            type="button"
                            className="tapv text-left text-[15px]"
                            onClick={() => setRirPad({ itemId: activeExercise.itemId, setKey: s.key })}
                          >
                            {s.rir || "—"}
                          </button>
                        ) : (
                          <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 30%, transparent)" }}>
                            —
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => confirmSet(activeExercise, s)}
                          disabled={pending}
                          aria-label="Satz übernehmen"
                          className="flex h-[38px] w-[38px] items-center justify-center rounded-sm text-[17px]"
                          style={{
                            border: `1px solid ${s.confirmed ? "#10b981" : "var(--dc-divider)"}`,
                            background: s.confirmed ? "#10b981" : "transparent",
                            color: s.confirmed ? "var(--dc-bg)" : "var(--dc-text)",
                          }}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSet(activeExercise, s)}
                          disabled={pending}
                          aria-label="Satz entfernen"
                          className="h-[38px] w-[30px] text-[15px]"
                          style={{ color: "color-mix(in srgb, var(--dc-text) 40%, transparent)" }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  });
                })()}

                <div className="mt-3.5 flex gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => addSet(activeExercise.itemId, "aufwaermsatz")}>
                    + Aufwärmsatz
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => addSet(activeExercise.itemId, "arbeitssatz")}>
                    + Arbeitssatz
                  </button>
                </div>

                <div className="mt-6 flex flex-col">
                  {exercises
                    .filter((e) => e.itemId !== activeExercise.itemId)
                    .map((e) => {
                      const rows = setsByItem[e.itemId] ?? [];
                      const done = rows.filter((r) => r.confirmed).length;
                      return (
                        <button
                          key={e.itemId}
                          type="button"
                          className="exrow"
                          onClick={() => setActiveItemId(e.itemId)}
                        >
                          <div className="flex items-baseline justify-between gap-2.5">
                            <span className="text-[16px]">{e.name}</span>
                            <span className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                              {done}/{Math.max(Number(e.sets) || 1, rows.length)}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                            {e.spec}
                            {e.restLabel ? ` · Pause ${e.restLabel}` : ""}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </>
            )}

            {cardio.map((c) => (
              <div key={c.itemId} className="mt-6.5 p-3.5" style={{ background: "var(--dc-surface)", marginTop: 26 }}>
                <div className="kicker-accent-2">Cardio</div>
                <div className="mt-1.5 text-base">{c.name}{c.spec ? ` — ${c.spec}` : ""}</div>
                <div className="mt-0.5 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                  {c.on && `On ${c.on} Belastung`}
                  {c.off && ` · Off ${c.off} Pause`}
                  {c.note && ` · ${c.note}`}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="mt-3.5">
            <div className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
              {karateRows.length} {karateRows.length === 1 ? "Übung" : "Übungen"}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {karateRows.map((row) => (
                <div key={row.itemId} className="p-4" style={{ background: "var(--dc-surface)" }}>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="text-[17px] leading-[1.25]">{row.name}</div>
                      <div className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                        {row.valLabel}
                        {row.rounds ? ` · ${row.rounds} ${row.rounds === 1 ? "Runde" : "Runden"}` : ""}
                        {row.restLabel ? ` · Pause ${row.restLabel}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInstrItemId(row.itemId)}
                      aria-label="Anweisung anzeigen"
                      className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[16px]"
                      style={{ border: "1px solid var(--dc-accent)", color: "var(--dc-accent-700)" }}
                    >
                      i
                    </button>
                  </div>
                  {row.desc && <div className="mt-2 text-[13px] leading-[1.5]">{row.desc}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}

        {editMode && (
          <button type="button" className="btn btn-primary btn-block mt-5" onClick={() => setRpeOpen(true)}>
            Training beenden
          </button>
        )}
      </div>

      {pad && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "color-mix(in srgb, #201e1d 45%, transparent)" }} onClick={() => setPad(null)}>
          <div
            className="mx-auto w-full max-w-[420px] p-4.5 pb-6.5"
            style={{ background: "var(--dc-surface)", borderRadius: "14px 14px 0 0", boxShadow: "var(--dc-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                {pad.field === "reps" ? "Wiederholungen" : "Gewicht"}
              </span>
              <button type="button" className="btn btn-ghost" onClick={() => setPad(null)}>
                Abbrechen
              </button>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[44px] leading-none">{pad.buffer || "0"}</span>
              <span className="text-base" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                {pad.unit}
              </span>
            </div>
            {pad.suggestion && (
              <div className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                Letztes Training: {pad.suggestion} {pad.unit}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => padStepBy(-pad.step)}>
                − {String(pad.step).replace(".", ",")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => padStepBy(pad.step)}>
                + {String(pad.step).replace(".", ",")}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {padKeys.map((k) => (
                <button key={k} type="button" className="padkey" onClick={() => padPress(k)}>
                  {k}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-block mt-3" onClick={padSave}>
              Übernehmen
            </button>
          </div>
        </div>
      )}

      {rirPad && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "color-mix(in srgb, #201e1d 45%, transparent)" }} onClick={() => setRirPad(null)}>
          <div
            className="mx-auto w-full max-w-[420px] p-4.5 pb-6.5"
            style={{ background: "var(--dc-surface)", borderRadius: "14px 14px 0 0", boxShadow: "var(--dc-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                RIR — Wiederholungen bis zum Muskelversagen übrig
              </span>
              <button type="button" className="btn btn-ghost" onClick={() => setRirPad(null)}>
                Abbrechen
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["0", "1", "2", "3", "4", "5+"].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="padkey"
                  onClick={() => saveRir(rirPad.itemId, rirPad.setKey, label === "5+" ? "5" : label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {rpeOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "color-mix(in srgb, #201e1d 50%, transparent)" }} onClick={() => setRpeOpen(false)}>
          <div
            className="mx-auto w-full max-w-[420px] p-5 pb-6.5"
            style={{ background: "var(--dc-surface)", borderRadius: "14px 14px 0 0", boxShadow: "var(--dc-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="kicker">Training beenden</div>
                <div className="mt-1.5 text-[21px] leading-[1.15]">Wie schwer war es?</div>
              </div>
              <button type="button" aria-label="Schließen" onClick={() => setRpeOpen(false)} className="-mr-2 -mt-2 h-10 w-10 text-lg" style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}>
                ✕
              </button>
            </div>
            <div className="mt-2 text-[13px] leading-[1.5]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
              Belastungsempfinden für die ganze Einheit — {RPE_WORDS[rpeValue ?? 5]}.
            </div>
            <div className="mt-3.5 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRpeValue(n)}
                  className="flex h-12 items-center justify-center text-lg"
                  style={{
                    border: "1px solid var(--dc-divider)",
                    background: rpeValue === n ? "var(--dc-accent)" : "transparent",
                    color: rpeValue === n ? "var(--dc-bg)" : "var(--dc-text)",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
              <span>1 · sehr leicht</span>
              <span>10 · maximal</span>
            </div>
            <button type="button" className="btn btn-primary btn-block mt-4" onClick={handleRpeSave} disabled={isSavingRpe}>
              {isSavingRpe ? "Wird gespeichert…" : "Speichern und beenden"}
            </button>
          </div>
        </div>
      )}

      {instrItemId &&
        (() => {
          const ex = exercises.find((e) => e.itemId === instrItemId);
          const row = karateRows.find((r) => r.itemId === instrItemId);
          const instr = ex?.exerciseId ? instructionsByExercise[ex.exerciseId] : undefined;
          const title = ex?.name ?? row?.name ?? "";
          const steps = instr?.steps ?? [];
          const fallbackNote = ex?.note ?? row?.desc ?? "";
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "color-mix(in srgb, #201e1d 50%, transparent)" }} onClick={() => setInstrItemId(null)}>
              <div
                className="w-full max-w-[440px] max-h-full overflow-y-auto p-5.5"
                style={{ background: "var(--dc-bg)", boxShadow: "var(--dc-shadow-lg)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="kicker">Anweisung vom Trainer</div>
                    <div className="mt-1.5 text-[21px] leading-[1.15]">{title}</div>
                  </div>
                  <button type="button" aria-label="Schließen" onClick={() => setInstrItemId(null)} className="-mr-2 -mt-2 h-10 w-10 text-lg" style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}>
                    ✕
                  </button>
                </div>
                <div className="mt-3.5">
                  {steps.length > 0 ? (
                    steps.map((s, i) => (
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
                    ))
                  ) : (
                    <p className="text-sm leading-[1.5]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                      {fallbackNote || "Noch keine Anweisung vom Trainer hinterlegt."}
                    </p>
                  )}
                </div>
                {instr?.video_url && (
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
                <button type="button" className="btn btn-primary btn-block mt-4.5" onClick={() => setInstrItemId(null)}>
                  Weiter trainieren
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
