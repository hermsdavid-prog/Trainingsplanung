"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  upsertExerciseResultAction,
  deleteExerciseResultSetAction,
} from "@/lib/actions/exercise-results";
import { saveSessionRpeAction } from "@/lib/actions/sessions";
import { addSessionExerciseAction } from "@/lib/actions/session-exercises";
import { upsertFeedbackAction } from "@/lib/actions/feedback";
import { CardioScreenshotField } from "@/components/athlete/cardio-screenshot-field";
import { exerciseNoteKey } from "@/lib/exercise-note-key";
import {
  SelfNoteReminder,
  ExerciseNotesButton,
  ExerciseNotesPanel,
  type SelfNote,
  type ExerciseNoteState,
} from "@/components/athlete/exercise-notes";
import type { BadgeAward } from "@/lib/badges";
import { SIDE_LABEL, countSets, isPairedRight, type Side } from "@/lib/per-side";
import { computeRsi, parseDecimal, type JumpMetrics } from "@/lib/jump-metrics";
import {
  estimateOneRmFromProfile,
  plausibleVelocity,
  readiness,
  suggestLoad,
  velocityLoss,
  type Fit,
  type VbtSpec,
} from "@/lib/vbt";
import {
  browserStorage,
  enqueueSet,
  isOffline,
  readQueue,
  removeQueuedSet,
  type QueuedSet,
} from "@/lib/offline-queue";

type SetType = "aufwaermsatz" | "arbeitssatz";

type SessionSet = {
  key: string;
  setNumber: number;
  type: SetType;
  reps: string;
  weight: string;
  rir: string;
  // Jump tests: ground contact time (ms) and a hand-entered RSI ("" = computed).
  contact: string;
  rsi: string;
  // VBT: mean velocity (m/s) of the fastest and of the last rep.
  velocity: string;
  velocityLast: string;
  confirmed: boolean;
  // Unilateral exercises: the left/right row of one set (see lib/per-side).
  side: Side | null;
  // Date the set was saved under; differs from the plan date when the
  // training was moved after logging. Unset for sets not saved yet.
  date?: string;
  // Logged without a connection: kept on the device, sent when back online.
  waiting?: boolean;
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
  // "je Seite": every set is logged as a left + right pair.
  perSide?: boolean;
  // Leistungsdiagnostik (e.g. CMJ): each set is one attempt with a single
  // measured value in `unit` — no reps, no RIR, no warm-ups.
  isTest?: boolean;
  // Jump test that also records contact time and/or RSI (Drop Jump, Pogo).
  metrics?: JumpMetrics;
  unit: string;
  // Video/link from the plan row, shown when the exercise library has no
  // instruction video of its own.
  linkUrl?: string;
  // Velocity-based training: target zone, loss limit and the athlete's
  // load-velocity profile from earlier sessions.
  vbt?: VbtSpec & { fit: Fit | null; mvt: number };
  initialSets: {
    setNumber: number;
    type: SetType;
    reps: string;
    weight: string;
    rir: string;
    side?: Side | null;
    date?: string;
    contact?: string;
    rsi?: string;
    velocity?: string;
    velocityLast?: string;
  }[];
  // First set number of this item's block (lib/set-numbers): 0, or 100, 200 …
  // when the same exercise appears more than once in the plan.
  setNumberBase?: number;
} & ExerciseNoteFields;

// Private reminder for next time + message to the trainer (see exercise-notes).
type ExerciseNoteFields = {
  noteKey: string;
  selfNote: SelfNote | null;
  coachNote: string;
};

export type SessionCardio = {
  itemId: string;
  name: string;
  spec: string;
  restLabel: string;
  on: string;
  off: string;
  note: string;
  // The athlete's own entered outcome (e.g. "7 Runden"), stored as
  // athlete_feedback.actual_value for this plan item.
  result: string;
  // Signed URL of the uploaded heart-rate screenshot, if any.
  screenshotUrl: string | null;
} & ExerciseNoteFields;

export type SessionKarateRow = {
  itemId: string;
  exerciseId: string | null;
  name: string;
  desc: string;
  note: string;
  linkUrl: string;
  rounds: number;
  restLabel: string;
  valLabel: string;
} & ExerciseNoteFields;

function parseLeadingNumber(label: string): string {
  const m = label.match(/\d+([.,]\d+)?/);
  return m ? m[0].replace(",", ".") : "";
}

// Only ever called from event handlers and timers, never during render.
function currentTimeMs(): number {
  return Date.now();
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

// Set row columns: label · reps · weight · RIR · ✓ · ✕. Sized for a 375px
// phone so "Aufwärmsatz" (number on its own line) and "100 kg" both fit
// without truncation.
const SET_GRID = "76px 46px minmax(0,1fr) 38px 40px 24px";
// VBT exercise: the RIR column becomes a wider m/s column.
const VBT_GRID = "76px 40px minmax(0,1fr) 46px 40px 24px";
// Jump test with contact time / RSI: Versuch · Höhe · Kontakt · RSI · ✓ · ✕.
const JUMP_GRID = "64px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 40px 24px";

type PadField = "reps" | "weight" | "contact" | "rsi";

function isJump(ex: SessionExercise): boolean {
  return !!ex.isTest && !!(ex.metrics?.contact || ex.metrics?.rsi);
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

// Same warm-up-plus-prescribed-work-sets shape the initial set list is
// built with below, factored out so a freshly added exercise (added mid-
// session, see addExercise) starts with the same pre-populated rows
// instead of an empty list the athlete would have to build up manually.
function buildInitialSets(ex: SessionExercise): SessionSet[] {
  // Warm-ups first, then work sets, each in logging order — a warm-up added
  // later has a higher set number but still belongs at the top.
  const ordered = [...ex.initialSets].sort(
    (a, b) => Number(a.type === "arbeitssatz") - Number(b.type === "arbeitssatz") || a.setNumber - b.setNumber
  );
  const confirmedSets: SessionSet[] = ordered.map((s) => ({
    key: nextKey(),
    setNumber: s.setNumber,
    type: s.type,
    reps: s.reps,
    weight: s.weight,
    rir: s.rir,
    contact: s.contact ?? "",
    rsi: s.rsi ?? "",
    velocity: s.velocity ?? "",
    velocityLast: s.velocityLast ?? "",
    confirmed: true,
    side: s.side ?? null,
    date: s.date,
  }));
  const suggested = Number(ex.sets) || 1;
  const rows: SessionSet[] = [];
  const taken = new Set(confirmedSets.map((r) => r.setNumber));
  let nextSetNumber = confirmedSets.reduce((m, r) => Math.max(m, r.setNumber), ex.setNumberBase ?? 0) + 1;
  // Only confirmed rows come back from the database: a left side whose
  // right side wasn't logged yet gets its (empty) right row back.
  confirmedSets.forEach((r, i) => {
    rows.push(r);
    if (ex.perSide && r.side === "links" && confirmedSets[i + 1]?.side !== "rechts") {
      const setNumber = taken.has(r.setNumber + 1) ? nextSetNumber++ : r.setNumber + 1;
      taken.add(setNumber);
      rows.push({
        ...r,
        key: nextKey(),
        setNumber,
        // A measured value is never carried over to the other side.
        weight: ex.isTest ? "" : r.weight,
        rir: "",
        contact: "",
        rsi: "",
        velocity: "",
        velocityLast: "",
        confirmed: false,
        side: "rechts",
      });
    }
  });
  nextSetNumber = Math.max(nextSetNumber, ...[...taken].map((n) => n + 1));
  // One set = one row, or a left + right row for a "je Seite" exercise.
  const newSet = (type: SetType): SessionSet[] =>
    (ex.perSide ? (["links", "rechts"] as const) : [null]).map((side) => ({
      key: nextKey(),
      setNumber: nextSetNumber++,
      type,
      reps: ex.isTest ? "" : parseLeadingNumber(ex.spec),
      weight: "",
      rir: "",
      contact: "",
      rsi: "",
      velocity: "",
      velocityLast: "",
      confirmed: false,
      side,
    }));
  const hasWarmup = rows.some((r) => r.type === "aufwaermsatz");
  if (!hasWarmup && !ex.isTest) {
    rows.unshift(...newSet("aufwaermsatz"));
  }
  const workSetCount = countSets(rows.filter((r) => r.type === "arbeitssatz"));
  for (let i = workSetCount; i < suggested; i++) {
    rows.push(...newSet("arbeitssatz"));
  }
  return rows;
}

// The rows that make up the set `set` belongs to: itself, or both sides.
function setMembers(rows: SessionSet[], set: SessionSet): SessionSet[] {
  const i = rows.findIndex((r) => r.key === set.key);
  if (i < 0) return [set];
  if (isPairedRight(rows, i)) return [rows[i - 1], rows[i]];
  if (isPairedRight(rows, i + 1)) return [rows[i], rows[i + 1]];
  return [rows[i]];
}

const fmt = (n: number, digits = 2) => n.toFixed(digits).replace(".", ",");

// m/s cell of a VBT set: green inside the target zone, amber when slower
// (too heavy) or when the velocity loss went past the limit.
function VelocityCell({
  set,
  vbt,
  onClick,
}: {
  set: SessionSet;
  vbt: VbtSpec;
  onClick: () => void;
}) {
  const v = parseDecimal(set.velocity);
  const loss = velocityLoss(v, parseDecimal(set.velocityLast));
  const belowTarget = v != null && vbt.targetMin != null && v < vbt.targetMin;
  const inTarget = v != null && vbt.targetMin != null && vbt.targetMax != null && v >= vbt.targetMin && v <= vbt.targetMax;
  const lossTooHigh = loss != null && vbt.lossLimit != null && loss > vbt.lossLimit;
  return (
    <button
      type="button"
      className="tapv text-[14px] leading-tight"
      onClick={onClick}
      title={belowTarget ? "Langsamer als der Zielbereich" : inTarget ? "Im Zielbereich" : undefined}
      style={{ color: belowTarget ? "#b45309" : inTarget ? "#0f8a5f" : undefined }}
    >
      {v != null ? fmt(v) : "—"}
      {loss != null && (
        <span className="block whitespace-nowrap text-[10.5px]" style={{ color: lossTooHigh ? "#b45309" : "var(--dc-muted)" }}>
          −{Math.round(loss)}%
        </span>
      )}
    </button>
  );
}

// Target zone, today's readiness and the suggested load of a VBT exercise.
function VbtPanel({
  vbt,
  rows,
  unit,
}: {
  vbt: VbtSpec & { fit: Fit | null; mvt: number };
  rows: SessionSet[];
  unit: string;
}) {
  // Latest set logged today with a velocity: anchors readiness and the
  // load suggestion to today's form.
  const today = [...rows]
    .reverse()
    .map((s) => ({ load: parseDecimal(s.weight), velocity: parseDecimal(s.velocity), confirmed: s.confirmed }))
    .find((p) => p.confirmed && p.load != null && p.load > 0 && p.velocity != null && p.velocity > 0) as
    | { load: number; velocity: number }
    | undefined;
  const { fit } = vbt;
  const form = fit && today ? readiness(fit, today.load, today.velocity) : null;
  const target = vbt.targetMin != null && vbt.targetMax != null ? (vbt.targetMin + vbt.targetMax) / 2 : null;
  const suggestion = fit && target != null ? suggestLoad(fit, target, today ?? null) : null;
  const oneRm = fit ? estimateOneRmFromProfile(fit, vbt.mvt) : null;
  const line = (label: string, value: ReactNode) => (
    <div className="flex justify-between gap-3">
      <span style={{ color: "var(--dc-muted)" }}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
  return (
    <div className="mt-2.5 flex flex-col gap-1 p-2.5 text-[13px]" style={{ background: "var(--dc-accent-100)" }}>
      {vbt.targetMin != null &&
        line(
          "Zielbereich",
          vbt.targetMin === vbt.targetMax ? `${fmt(vbt.targetMin)} m/s` : `${fmt(vbt.targetMin)}–${fmt(vbt.targetMax ?? vbt.targetMin)} m/s`
        )}
      {vbt.lossLimit != null && line("Satz beenden bei", `${vbt.lossLimit} % Geschwindigkeitsverlust`)}
      {suggestion != null && line(today ? "Last für das Ziel (heute)" : "Last für das Ziel", `ca. ${fmt(suggestion, 1).replace(",0", "")} ${unit}`)}
      {form != null &&
        line(
          "Tagesform",
          <span style={{ color: form <= -8 ? "#b45309" : form >= 3 ? "#0f8a5f" : undefined }}>
            {form > 0 ? "+" : ""}
            {String(form).replace(".", ",")} % {form <= -8 ? "(langsamer als üblich, Last senken)" : form >= 3 ? "(schneller als üblich)" : "(normal)"}
          </span>
        )}
      {oneRm != null &&
        line(`Geschätztes 1RM (bei ${fmt(vbt.mvt)} m/s)`, `ca. ${fmt(oneRm, 1).replace(",0", "")} ${unit}`)}
      {!fit && (
        <p style={{ color: "var(--dc-muted)" }}>
          Noch kein Last-Geschwindigkeits-Profil. Es entsteht automatisch, sobald Sätze mit mindestens zwei verschiedenen
          Lasten und Geschwindigkeit eingetragen sind (auch Aufwärmsätze zählen).
        </p>
      )}
    </div>
  );
}

export function WorkoutSession({
  athleteId,
  planId,
  planDate,
  planTitle,
  planKicker,
  backHref,
  doneHref = "/athlete",
  categoryLabel,
  exercises: initialExercises,
  cardio,
  karateRows,
  instructionsByExercise,
  initialRpe,
  lastKnownByExercise = {},
  canAddExercises = false,
  exerciseLibrary = [],
  allowCoachHint = true,
}: {
  athleteId: string;
  planId: string;
  planDate: string;
  planTitle: string;
  planKicker: string;
  backHref: string;
  // Where "Speichern und beenden" lands: the athlete's home, or a coach's
  // "Mein Training" when they trained along themselves.
  doneHref?: string;
  categoryLabel: string;
  exercises: SessionExercise[];
  cardio: SessionCardio[];
  karateRows: SessionKarateRow[];
  instructionsByExercise: Record<string, ExerciseInstructions>;
  initialRpe: number | null;
  lastKnownByExercise?: Record<string, { weight: string; reps: string }>;
  canAddExercises?: boolean;
  exerciseLibrary?: { id: string; name: string }[];
  // Off when a coach trains along — there's no trainer to write to.
  allowCoachHint?: boolean;
}) {
  const isAthletik = categoryLabel.trim().toLowerCase() === "athletik";
  const router = useRouter();

  // A saved RPE means this training was already ended in an earlier visit —
  // land back on a compact "abgeschlossen" summary instead of jumping
  // straight into live entry, with an explicit opt-in to keep editing.
  const [editMode, setEditMode] = useState(initialRpe === null);

  const [exercises, setExercises] = useState<SessionExercise[]>(initialExercises);

  const [setsByItem, setSetsByItem] = useState<Record<string, SessionSet[]>>(() => {
    const map: Record<string, SessionSet[]> = {};
    for (const ex of initialExercises) {
      map[ex.itemId] = buildInitialSets(ex);
    }
    return map;
  });

  // Number of sets waiting on this device for a connection.
  const [queuedCount, setQueuedCount] = useState(0);

  // Exercises stay in plan order and expand in place (several may be open)
  // — tapping one used to move it to the top of the page, which made the
  // list jump under the athlete's finger.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(initialExercises[0] ? [initialExercises[0].itemId] : [])
  );
  function toggleOpen(itemId: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  const [notes, setNotes] = useState<Record<string, ExerciseNoteState>>(() =>
    Object.fromEntries(
      [...initialExercises, ...cardio, ...karateRows].map((x) => [x.itemId, { self: x.selfNote, coach: x.coachNote }])
    )
  );
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null);

  // Bottom-row "✎ Notiz" button + its editor for one exercise/cardio/round.
  function renderNotes(itemId: string, noteKey: string, leading?: ReactNode) {
    const state = notes[itemId] ?? { self: null, coach: "" };
    const open = notesOpenId === itemId;
    return (
      <>
        <div className="mt-3 flex flex-wrap gap-2">
          {leading}
          <ExerciseNotesButton state={state} open={open} onToggle={() => setNotesOpenId(open ? null : itemId)} />
        </div>
        <ExerciseNotesPanel
          key={open ? "open" : "closed"}
          itemId={itemId}
          noteKey={noteKey}
          state={state}
          open={open}
          allowCoachHint={allowCoachHint}
          onSaved={(next) => setNotes((prev) => ({ ...prev, [itemId]: next }))}
          onClose={() => setNotesOpenId(null)}
        />
      </>
    );
  }

  const [cardioResults, setCardioResults] = useState<Record<string, string>>(() =>
    Object.fromEntries(cardio.map((c) => [c.itemId, c.result]))
  );
  const [savedCardioResults, setSavedCardioResults] = useState<Record<string, string>>(() =>
    Object.fromEntries(cardio.map((c) => [c.itemId, c.result]))
  );
  const [savingCardioId, setSavingCardioId] = useState<string | null>(null);

  async function saveCardioResult(itemId: string) {
    const value = (cardioResults[itemId] ?? "").trim();
    if (value === (savedCardioResults[itemId] ?? "")) return;
    setSavingCardioId(itemId);
    const result = await upsertFeedbackAction(itemId, { actual_value: value });
    setSavingCardioId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSavedCardioResults((prev) => ({ ...prev, [itemId]: value }));
    toast.success("Ergebnis gespeichert.");
  }

  const [addExerciseName, setAddExerciseName] = useState("");
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  async function addExercise() {
    const name = addExerciseName.trim();
    if (!name) return;
    setIsAddingExercise(true);
    const result = await addSessionExerciseAction(planId, name);
    setIsAddingExercise(false);
    if (result.error || !result.item) {
      toast.error(result.error ?? "Übung konnte nicht hinzugefügt werden.");
      return;
    }
    // Already in the plan? Then this one gets the next block of set numbers.
    const sameExerciseBases = exercises
      .filter((e) => e.exerciseId && e.exerciseId === result.item!.exerciseId)
      .map((e) => e.setNumberBase ?? 0);
    const newExercise: SessionExercise = {
      setNumberBase: sameExerciseBases.length ? Math.max(...sameExerciseBases) + 100 : 0,
      itemId: result.item.itemId,
      exerciseId: result.item.exerciseId,
      name: result.item.name,
      spec: "",
      sets: "3",
      restLabel: "",
      restSeconds: 0,
      note: "",
      unit: "kg",
      perSide: false,
      initialSets: [],
      noteKey: exerciseNoteKey(result.item.exerciseId, result.item.name),
      selfNote: null,
      coachNote: "",
    };
    setExercises((prev) => [...prev, newExercise]);
    setSetsByItem((prev) => ({ ...prev, [newExercise.itemId]: buildInitialSets(newExercise) }));
    setOpenIds((prev) => new Set(prev).add(newExercise.itemId));
    setAddExerciseName("");
    toast.success(`${newExercise.name} hinzugefügt.`);
  }

  // The rest timer counts down to an end timestamp rather than ticking a
  // counter, so it stays right when the phone was locked or the tab slept,
  // and it vibrates (where supported) when the rest is over.
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const restRemaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startRest(seconds: number) {
    const t = currentTimeMs();
    setNow(t);
    setRestEndsAt(t + seconds * 1000);
  }

  useEffect(() => {
    if (!restEndsAt) return;
    timerRef.current = setInterval(() => {
      const t = currentTimeMs();
      setNow(t);
      if (t >= restEndsAt) {
        setRestEndsAt(null);
        try {
          navigator.vibrate?.([200, 100, 200]);
        } catch {
          // not supported
        }
      }
    }, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restEndsAt]);

  const [pad, setPad] = useState<{
    itemId: string;
    setKey: string;
    field: PadField;
    buffer: string;
    unit: string;
    step: number;
    suggestion?: string;
    isTest?: boolean;
  } | null>(null);

  // RIR ("Reps in Reserve") is asked per work set right after it's logged —
  // MacroFactor-style per-set feedback, separate from the end-of-session
  // RPE below. A small fixed picker (not the numeric pad) since it's always
  // one of a handful of values.
  const [rirPad, setRirPad] = useState<{ itemId: string; setKey: string } | null>(null);
  // VBT: velocity of the fastest and the last rep, typed from the sensor app.
  const [vbtPad, setVbtPad] = useState<{ itemId: string; setKey: string; best: string; last: string } | null>(null);

  const [instrItemId, setInstrItemId] = useState<string | null>(null);
  const [rpeOpen, setRpeOpen] = useState(false);
  const [rpeValue, setRpeValue] = useState<number | null>(initialRpe);
  const [isSavingRpe, setIsSavingRpe] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    let tonnage = 0;
    let tonnageUnit = "kg";
    for (const ex of exercises) {
      const rows = setsByItem[ex.itemId] ?? [];
      const suggested = Number(ex.sets) || 1;
      total += Math.max(suggested, countSets(rows));
      done += countSets(rows, (r) => r.confirmed);
      if (ex.isTest) continue; // jump heights aren't load
      for (const r of rows) {
        if (!r.confirmed) continue;
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

  function updateSet(itemId: string, key: string, field: PadField | "rir" | "velocity" | "velocityLast", value: string) {
    setSetsByItem((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((s) => (s.key === key ? { ...s, [field]: value } : s)),
    }));
  }

  // A new Arbeitssatz always goes on the end. A new Aufwärmsatz goes right
  // after the last existing warm-up instead — so warm-ups stay grouped
  // together at the top of the list rather than trailing after work sets
  // that were already logged.
  function addSet(itemId: string, type: SetType) {
    const ex = exercises.find((e) => e.itemId === itemId);
    const perSide = ex?.perSide ?? false;
    setSetsByItem((prev) => {
      const rows = prev[itemId] ?? [];
      const maxSetNumber = rows.reduce((m, r) => Math.max(m, r.setNumber), ex?.setNumberBase ?? 0);
      const newSets: SessionSet[] = (perSide ? (["links", "rechts"] as const) : [null]).map((side, i) => ({
        key: nextKey(),
        setNumber: maxSetNumber + 1 + i,
        type,
        reps: "",
        weight: "",
        rir: "",
        contact: "",
        rsi: "",
        velocity: "",
        velocityLast: "",
        confirmed: false,
        side,
      }));
      if (type === "arbeitssatz") {
        return { ...prev, [itemId]: [...rows, ...newSets] };
      }
      let insertAt = 0;
      rows.forEach((r, i) => {
        if (r.type === "aufwaermsatz") insertAt = i + 1;
      });
      const next = [...rows];
      next.splice(insertAt, 0, ...newSets);
      return { ...prev, [itemId]: next };
    });
  }

  // Removes the whole set — for a "je Seite" exercise both sides at once.
  async function removeSet(ex: SessionExercise, set: SessionSet) {
    const members = setMembers(setsByItem[ex.itemId] ?? [], set);
    // A saved set is gone for good — ask first (the ✕ sits right next to ✓).
    if (members.some((m) => m.confirmed) && !window.confirm("Diesen gespeicherten Satz löschen?")) return;
    for (const m of members) {
      if (!m.confirmed) continue;
      if (!ex.exerciseId) return;
      if (m.waiting) {
        // Never reached the server — just drop it from the device queue.
        const q = readQueue(browserStorage(), planId).find(
          (x) => x.exerciseId === ex.exerciseId && x.setNumber === m.setNumber
        );
        if (q) setQueuedCount(removeQueuedSet(browserStorage(), planId, q).length);
        continue;
      }
      setPendingKey(set.key);
      let result: Awaited<ReturnType<typeof deleteExerciseResultSetAction>>;
      try {
        result = await deleteExerciseResultSetAction(ex.exerciseId, m.date ?? planDate, m.setNumber, planId);
      } catch {
        setPendingKey(null);
        toast.error("Keine Verbindung — Löschen geht erst wieder mit Netz.");
        return;
      }
      setPendingKey(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
    }
    const keys = new Set(members.map((m) => m.key));
    setSetsByItem((prev) => ({
      ...prev,
      [ex.itemId]: prev[ex.itemId].filter((s) => !keys.has(s.key)),
    }));
  }

  async function confirmSet(ex: SessionExercise, set: SessionSet, opts: { askRir?: boolean; startRest?: boolean } = {}) {
    if (!ex.exerciseId) {
      toast.error("Diese Übung ist nicht in der Übungsbibliothek verknüpft.");
      return;
    }
    // Bodyweight exercises (Liegestütz, Klimmzug): reps alone are enough,
    // saved as 0 kg. A test attempt needs its measured value.
    const weight = set.weight.trim() ? Number(set.weight.replace(",", ".")) : 0;
    // Jump tests: contact time and RSI next to the height. The RSI is
    // computed from height and contact time unless one was typed in.
    const contactMs = ex.metrics?.contact ? parseDecimal(set.contact) : null;
    const rsi = ex.metrics?.rsi ? (parseDecimal(set.rsi) ?? computeRsi(weight || null, contactMs)) : null;
    const hasJumpValue = contactMs != null || rsi != null;
    if (
      ex.isTest
        ? (!set.weight.trim() && !hasJumpValue) || Number.isNaN(weight)
        : (!set.weight.trim() && !set.reps.trim()) || Number.isNaN(weight)
    ) {
      toast.error(ex.isTest ? "Bitte einen Messwert eintragen." : "Bitte Gewicht oder Wiederholungen eintragen.");
      return;
    }
    const reps = !ex.isTest && set.reps.trim() ? Number(set.reps.replace(",", ".")) : null;
    const rir = !ex.isTest && !ex.vbt && set.type === "arbeitssatz" && set.rir.trim() ? Number(set.rir) : null;
    const velocity = ex.vbt ? parseDecimal(set.velocity) : null;
    if (velocity != null && !plausibleVelocity(velocity)) {
      toast.error("Die Geschwindigkeit ist unplausibel. Bitte in m/s eintragen, z. B. 0,62.");
      return;
    }
    const lastRaw = ex.vbt ? parseDecimal(set.velocityLast) : null;
    const velocityLast =
      velocity != null && plausibleVelocity(lastRaw) && lastRaw <= velocity ? lastRaw : null;
    const entry: QueuedSet = {
      exerciseId: ex.exerciseId,
      date: set.date ?? planDate,
      setNumber: set.setNumber,
      weight,
      reps,
      unit: ex.unit || "kg",
      setType: set.type,
      rir,
      side: set.side,
      contactMs,
      rsi,
      velocity,
      velocityLast,
      itemId: ex.itemId,
    };
    setPendingKey(set.key);
    let result: Awaited<ReturnType<typeof upsertExerciseResultAction>> | null = null;
    if (!isOffline()) {
      try {
        result = await sendSet(entry);
      } catch {
        result = null; // no connection — queued below
      }
    }
    setPendingKey(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    const waiting = result === null;
    if (waiting) {
      setQueuedCount(enqueueSet(browserStorage(), planId, entry).length);
    } else if (set.waiting) {
      setQueuedCount(removeQueuedSet(browserStorage(), planId, entry).length);
    }
    setSetsByItem((prev) => {
      const rows = prev[ex.itemId];
      const i = rows.findIndex((s) => s.key === set.key);
      return {
        ...prev,
        [ex.itemId]: rows.map((s, j) => {
          if (s.key === set.key) return { ...s, confirmed: true, waiting, date: set.date ?? planDate };
          // Left side logged: suggest the same load for the right side
          // (still to be confirmed with ✓, nothing is saved for it yet).
          if (!ex.isTest && j === i + 1 && set.side === "links" && isPairedRight(rows, j) && !s.confirmed && !s.weight.trim()) {
            return { ...s, weight: set.weight, reps: set.reps.trim() ? set.reps : s.reps };
          }
          // Following sets of the same kind (and side) start with this load
          // as a suggestion, so an unchanged weight is one tap on ✓.
          if (!ex.isTest && j > i && !s.confirmed && !s.weight.trim() && s.type === set.type && s.side === set.side && set.weight.trim()) {
            return { ...s, weight: set.weight };
          }
          return s;
        }),
      };
    });
    // Only a newly logged set starts the rest — not adding RIR to it or
    // correcting it afterwards.
    if ((opts.startRest ?? !set.confirmed) && ex.restSeconds > 0 && set.side !== "links") {
      startRest(ex.restSeconds);
    }
    // Ask for RIR right after a work set is logged instead of relying on
    // the athlete to find the small RIR cell (for "je Seite" once, after
    // the right side).
    // (for "je Seite" for each side, since each side has its own bar speed).
    if (opts.askRir && ex.vbt && !set.velocity.trim()) {
      // VBT replaces RIR: ask for the bar speed from the sensor app instead.
      setVbtPad({ itemId: ex.itemId, setKey: set.key, best: "", last: "" });
    } else if (opts.askRir && !ex.isTest && !ex.vbt && set.type === "arbeitssatz" && !set.rir.trim() && set.side !== "links") {
      setRirPad({ itemId: ex.itemId, setKey: set.key });
    }
    if (result) notifyNewBadges(result.newBadges);
  }

  function sendSet(q: QueuedSet) {
    return upsertExerciseResultAction(
      q.exerciseId,
      q.date,
      q.setNumber,
      q.weight,
      q.reps,
      q.unit,
      planId,
      q.setType,
      q.rir,
      q.side,
      q.contactMs ?? null,
      q.rsi ?? null,
      q.velocity ?? null,
      q.velocityLast ?? null
    );
  }

  // Sends everything logged offline, oldest first. Stops at the first
  // failure — no connection (tried again on the next "online") or a refusal
  // such as an expired login (reported, the sets stay queued).
  const flushingRef = useRef(false);
  async function flushQueue() {
    if (flushingRef.current) return;
    const storage = browserStorage();
    if (isOffline()) {
      setQueuedCount(readQueue(storage, planId).length);
      return;
    }
    const queue = readQueue(storage, planId);
    setQueuedCount(queue.length);
    if (queue.length === 0) return;
    flushingRef.current = true;
    let sent = 0;
    try {
      for (const q of queue) {
        let res: Awaited<ReturnType<typeof upsertExerciseResultAction>>;
        try {
          res = await sendSet(q);
        } catch {
          break;
        }
        if (res.error) {
          // Kept on the device (e.g. the login ran out meanwhile): nothing
          // logged is thrown away; the athlete can retry after signing in
          // or remove the set with ✕.
          toast.error(`Offline eingetragene Sätze konnten nicht gespeichert werden: ${res.error}`);
          break;
        }
        setQueuedCount(removeQueuedSet(storage, planId, q).length);
        sent += 1;
        setSetsByItem((prev) => {
          const rows = prev[q.itemId];
          if (!rows) return prev;
          return {
            ...prev,
            [q.itemId]: rows.map((r) => (r.setNumber === q.setNumber && r.waiting ? { ...r, waiting: false } : r)),
          };
        });
      }
    } finally {
      flushingRef.current = false;
    }
    if (sent > 0) {
      toast.success(`${sent} offline eingetragene${sent === 1 ? "r Satz" : " Sätze"} gespeichert.`);
      router.refresh();
    }
  }

  // Leftovers from an earlier visit without connection are sent right away;
  // anything logged offline now goes out once the phone is back online.
  useEffect(() => {
    const onOnline = () => void flushQueue();
    const t = setTimeout(onOnline, 0);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // The field to fill in always starts empty (or with whatever the athlete
  // already entered) — the last-known value is shown only as a reference
  // hint below it, never pre-filled, so nothing gets saved without the
  // athlete actually typing it.
  function openPad(itemId: string, setKey: string, field: PadField, current: string, unit: string) {
    const ex = exercises.find((e) => e.itemId === itemId);
    const suggestion = ex?.exerciseId ? lastKnownByExercise[ex.exerciseId] : undefined;
    const suggestedValue =
      suggestion && (field === "weight" || field === "reps")
        ? field === "weight"
          ? suggestion.weight
          : suggestion.reps
        : undefined;
    const isTest = ex?.isTest ?? false;
    setPad({
      itemId,
      setKey,
      field,
      buffer: current,
      unit,
      step: field === "contact" ? 5 : field === "rsi" ? 0.05 : isTest ? 0.5 : field === "weight" ? 2.5 : 1,
      suggestion: suggestedValue,
      isTest,
    });
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

  // Auto-save whenever there's a weight to save: a fresh set becomes
  // confirmed as soon as it has one (reps stay optional, matching
  // confirmSet's own validation), and editing an ALREADY-confirmed set
  // (e.g. fixing a typo after the session) re-saves it immediately too.
  // This used to only fire for brand-new sets — a correction to a
  // confirmed set only updated local state and silently never reached the
  // server, so "Nachträglich bearbeiten" looked like it worked but the fix
  // was lost on reload.
  function padSave() {
    if (!pad) return;
    const { itemId, setKey, field, buffer } = pad;
    setPad(null);
    updateSet(itemId, setKey, field, buffer);
    const current = (setsByItem[itemId] ?? []).find((s) => s.key === setKey);
    if (!current) return;
    const updated = { ...current, [field]: buffer };
    if (updated.weight.trim() || (exercises.find((e) => e.itemId === itemId)?.isTest && (updated.contact.trim() || updated.rsi.trim()))) {
      const ex = exercises.find((e) => e.itemId === itemId);
      if (ex) confirmSet(ex, updated, { askRir: !current.confirmed });
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
    await confirmSet(ex, { ...current, rir: rirValue }, { startRest: false });
  }

  async function saveVbt() {
    if (!vbtPad) return;
    const { itemId, setKey, best, last } = vbtPad;
    setVbtPad(null);
    const bestTrim = best.trim();
    const lastTrim = last.trim();
    setSetsByItem((prev) => ({
      ...prev,
      [itemId]: prev[itemId].map((s) => (s.key === setKey ? { ...s, velocity: bestTrim, velocityLast: lastTrim } : s)),
    }));
    const ex = exercises.find((e) => e.itemId === itemId);
    const current = (setsByItem[itemId] ?? []).find((s) => s.key === setKey);
    if (!ex || !current || !current.confirmed) return;
    await confirmSet(ex, { ...current, velocity: bestTrim, velocityLast: lastTrim }, { startRest: false });
  }

  async function handleRpeSave() {
    if (!rpeValue) {
      toast.error("Bitte ein Belastungsempfinden wählen.");
      return;
    }
    if (queuedCount > 0) {
      toast.error("Es warten noch Sätze ohne Verbindung. Bitte beende das Training, sobald du wieder Netz hast.");
      return;
    }
    setIsSavingRpe(true);
    let result: Awaited<ReturnType<typeof saveSessionRpeAction>>;
    try {
      result = await saveSessionRpeAction(planId, rpeValue);
    } catch {
      setIsSavingRpe(false);
      toast.error("Keine Verbindung — bitte gleich noch einmal versuchen.");
      return;
    }
    setIsSavingRpe(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Training gespeichert.");
    notifyNewBadges(result.newBadges);
    router.push(doneHref);
  }

  const padKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"];

  return (
    <div className="relative">
      <Link href={backHref} className="btn btn-ghost">
        ← Zur Trainingsübersicht
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
                <div className="mt-0.5 text-[13px]" style={{ color: "var(--dc-muted)" }}>
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
            {/* A cardio-only plan has no sets to count. */}
            {exercises.length > 0 && (
              <>
                <div className="mt-3.5 flex items-baseline justify-between text-[13px]">
                  <span>
                    {totals.done} von {totals.total} Sätzen
                  </span>
                  <span style={{ color: "var(--dc-muted)" }}>
                    {totals.tonnage > 0 ? `${totals.tonnage.toLocaleString("de-DE")} ${totals.tonnageUnit}` : "—"}
                  </span>
                </div>
                <div className="mt-2 h-[3px]" style={{ background: "color-mix(in srgb, var(--dc-text) 12%, transparent)" }}>
                  <div className="h-[3px]" style={{ background: "var(--dc-accent)", width: progressWidth }} />
                </div>
              </>
            )}

            {queuedCount > 0 && (
              <div
                className="mt-3.5 flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                style={{ background: "#fef3c7", color: "#78350f" }}
                role="status"
              >
                <span>
                  Keine Verbindung: {queuedCount} {queuedCount === 1 ? "Satz ist" : "Sätze sind"} auf dem Handy gespeichert
                  und {queuedCount === 1 ? "wird" : "werden"} gesendet, sobald wieder Netz da ist.
                </span>
                <button type="button" className="btn btn-ghost flex-none" onClick={() => void flushQueue()}>
                  Jetzt senden
                </button>
              </div>
            )}

            {restRemaining > 0 && (
              // Sticks below the app's sticky header (~56px) while scrolling
              // to the next exercise.
              <div
                className="mt-3.5 flex items-center justify-between px-3.5 py-2.5"
                style={{ background: "var(--dc-accent-100)", position: "sticky", top: 56, zIndex: 25, boxShadow: "var(--dc-shadow-md)" }}
                role="timer"
                aria-live="off"
              >
                <span className="text-sm">
                  Pause · <strong>{formatMMSS(restRemaining)}</strong>
                </span>
                <button type="button" className="btn btn-ghost" onClick={() => setRestEndsAt(null)}>
                  Überspringen
                </button>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              {exercises.map((ex) => {
                const rows = setsByItem[ex.itemId] ?? [];
                const done = countSets(rows, (r) => r.confirmed);
                const planned = Math.max(Number(ex.sets) || 1, countSets(rows));
                const isOpen = openIds.has(ex.itemId);
                const complete = done > 0 && done >= planned;
                return (
                  <div key={ex.itemId} style={{ background: "var(--dc-surface)", border: "1px solid var(--dc-divider)" }}>
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        onClick={() => toggleOpen(ex.itemId)}
                        aria-expanded={isOpen}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3.5 py-3 text-left"
                        style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--dc-text)" }}
                      >
                        <span className="min-w-0">
                          <span
                            className="block text-[17px] font-semibold leading-tight"
                            style={{ fontFamily: "var(--dc-font-heading)" }}
                          >
                            {ex.name}
                          </span>
                          <span className="mt-0.5 block text-[13px]" style={{ color: "var(--dc-muted)" }}>
                            {ex.isTest
                              ? `Test · ${
                                  isJump(ex)
                                    ? ["Höhe", ex.metrics?.contact ? "Kontaktzeit" : null, ex.metrics?.rsi ? "RSI" : null]
                                        .filter(Boolean)
                                        .join(", ")
                                    : `Messwert in ${ex.unit}`
                                }`
                              : ex.spec}
                            {ex.restLabel ? ` · Pause ${ex.restLabel}` : ""}
                          </span>
                          {ex.perSide && (
                            <span className="mt-0.5 block text-[12px]" style={{ color: "var(--dc-accent-700)" }}>
                              {ex.isTest ? "Jeder Versuch" : "Jeder Satz"} mit linker und rechter Seite
                            </span>
                          )}
                        </span>
                        <span className="flex flex-none items-center gap-2.5">
                          <span
                            className="text-[13px] tabular-nums"
                            style={{ color: complete ? "#0f8a5f" : "var(--dc-muted)", fontWeight: complete ? 600 : 400 }}
                          >
                            {complete ? "✓ " : ""}
                            {done}/{planned}
                          </span>
                          <span aria-hidden style={{ color: "var(--dc-accent-700)" }}>
                            {isOpen ? "▴" : "▾"}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInstrItemId(ex.itemId)}
                        aria-label={`Anweisung zu ${ex.name} anzeigen`}
                        className="flex w-11 flex-none items-center justify-center text-[15px]"
                        style={{ background: "transparent", border: 0, borderLeft: "1px solid var(--dc-divider)", color: "var(--dc-accent-700)", cursor: "pointer" }}
                      >
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full"
                          style={{ border: "1px solid var(--dc-accent)" }}
                        >
                          i
                        </span>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="border-t px-2.5 pb-3.5" style={{ borderColor: "var(--dc-divider)" }}>
                        {ex.note && (
                          <p className="mt-2.5 text-[13px]" style={{ color: "var(--dc-muted)" }}>
                            {ex.note}
                          </p>
                        )}
                        {ex.vbt && <VbtPanel vbt={ex.vbt} rows={rows} unit={ex.unit || "kg"} />}
                        <SelfNoteReminder note={notes[ex.itemId]?.self ?? null} />
                        <div
                          className="mt-3 grid gap-1 pb-1.5 text-[10.5px] font-semibold uppercase"
                          style={{
                            gridTemplateColumns: isJump(ex) ? JUMP_GRID : ex.vbt ? VBT_GRID : SET_GRID,
                            letterSpacing: ".07em",
                            color: "var(--dc-muted)",
                            borderBottom: "1px solid var(--dc-divider)",
                          }}
                        >
                          {isJump(ex) ? (
                            <>
                              <span>Versuch</span>
                              <span>Höhe ({ex.unit})</span>
                              <span>{ex.metrics?.contact ? "Kontakt (ms)" : ""}</span>
                              <span>{ex.metrics?.rsi ? "RSI" : ""}</span>
                            </>
                          ) : (
                            <>
                              <span>{ex.isTest ? "Versuch" : "Satz"}</span>
                              <span>{ex.isTest ? "" : "Wdh."}</span>
                              <span>{ex.isTest ? `Messwert (${ex.unit})` : "Gewicht"}</span>
                              <span>{ex.isTest ? "" : ex.vbt ? "m/s" : "RIR"}</span>
                            </>
                          )}
                          <span />
                          <span />
                        </div>
                        {(() => {
                          const typeCounts: Partial<Record<SetType, number>> = {};
                          return rows.map((s, si) => {
                            // The right side continues the set started by the left one:
                            // no new number, no divider in between.
                            const isRight = isPairedRight(rows, si);
                            const hasRight = isPairedRight(rows, si + 1);
                            if (!isRight) typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
                            const pending = pendingKey === s.key;
                            return (
                              <div
                                key={s.key}
                                className={`grid items-center gap-1 ${hasRight ? "pt-2 pb-1" : isRight ? "pt-1 pb-2" : "py-2"}`}
                                style={{
                                  gridTemplateColumns: isJump(ex) ? JUMP_GRID : ex.vbt ? VBT_GRID : SET_GRID,
                                  borderBottom: hasRight ? "none" : "1px solid color-mix(in srgb, var(--dc-text) 8%, transparent)",
                                }}
                              >
                                <span
                                  className="text-[12.5px] leading-tight"
                                  style={{ color: s.confirmed ? "var(--dc-accent-700)" : "var(--dc-muted)" }}
                                >
                                  {isRight ? null : ex.isTest ? "Versuch" : SET_TYPE_LABEL[s.type]}
                                  <span className="block tabular-nums">
                                    {isRight ? "" : typeCounts[s.type]}
                                    {s.side ? (
                                      <span style={{ fontWeight: 600 }}>
                                        {isRight ? "" : " · "}
                                        {SIDE_LABEL[s.side]}
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                                {isJump(ex) ? (
                                  <>
                                    <button
                                      type="button"
                                      className="tapv text-[16px]"
                                      onClick={() => openPad(ex.itemId, s.key, "weight", s.weight, ex.unit || "cm")}
                                    >
                                      {s.weight || "—"}
                                    </button>
                                    {ex.metrics?.contact ? (
                                      <button
                                        type="button"
                                        className="tapv text-[16px]"
                                        onClick={() => openPad(ex.itemId, s.key, "contact", s.contact, "ms")}
                                      >
                                        {s.contact || "—"}
                                      </button>
                                    ) : (
                                      <span />
                                    )}
                                    {ex.metrics?.rsi ? (
                                      (() => {
                                        const auto = s.rsi.trim()
                                          ? null
                                          : computeRsi(parseDecimal(s.weight), parseDecimal(s.contact));
                                        return (
                                          <button
                                            type="button"
                                            className="tapv text-[16px]"
                                            onClick={() => openPad(ex.itemId, s.key, "rsi", s.rsi, "")}
                                            title={auto != null ? "Aus Höhe und Kontaktzeit berechnet" : undefined}
                                            style={auto != null ? { color: "var(--dc-muted)" } : undefined}
                                          >
                                            {s.rsi || (auto != null ? String(auto).replace(".", ",") : "—")}
                                          </button>
                                        );
                                      })()
                                    ) : (
                                      <span />
                                    )}
                                  </>
                                ) : (
                                  <>
                                {ex.isTest ? (
                                  <span />
                                ) : (
                                  <button
                                    type="button"
                                    className="tapv text-[17px]"
                                    onClick={() => openPad(ex.itemId, s.key, "reps", s.reps, "Wdh.")}
                                  >
                                    {s.reps || "—"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="tapv text-[17px]"
                                  style={{ whiteSpace: "nowrap" }}
                                  onClick={() => openPad(ex.itemId, s.key, "weight", s.weight, ex.unit || "kg")}
                                >
                                  {s.weight ? `${s.weight} ${ex.unit || "kg"}` : "—"}
                                </button>
                                {ex.isTest ? (
                                  <span />
                                ) : ex.vbt && s.confirmed ? (
                                  <VelocityCell
                                    set={s}
                                    vbt={ex.vbt}
                                    onClick={() =>
                                      setVbtPad({ itemId: ex.itemId, setKey: s.key, best: s.velocity, last: s.velocityLast })
                                    }
                                  />
                                ) : ex.vbt ? (
                                  <span className="pl-2 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 30%, transparent)" }}>
                                    —
                                  </span>
                                ) : s.type === "arbeitssatz" && s.confirmed ? (
                                  <button
                                    type="button"
                                    className="tapv text-[15px]"
                                    onClick={() => setRirPad({ itemId: ex.itemId, setKey: s.key })}
                                  >
                                    {s.rir || "—"}
                                  </button>
                                ) : (
                                  <span className="pl-2 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 30%, transparent)" }}>
                                    —
                                  </span>
                                )}
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => confirmSet(ex, s, { askRir: !s.confirmed })}
                                  disabled={pending}
                                  aria-label={s.waiting ? "Gespeichert auf dem Gerät, wird bei Verbindung gesendet" : "Satz übernehmen"}
                                  title={s.waiting ? "Wartet auf Verbindung" : undefined}
                                  className="flex h-10 w-10 items-center justify-center rounded-sm text-[17px]"
                                  style={{
                                    border: `1px solid ${s.waiting ? "#d97706" : s.confirmed ? "#10b981" : "var(--dc-divider)"}`,
                                    background: s.waiting ? "#fef3c7" : s.confirmed ? "#10b981" : "transparent",
                                    color: s.waiting ? "#92400e" : s.confirmed ? "#fff" : "var(--dc-text)",
                                  }}
                                >
                                  {s.waiting ? "⏳" : "✓"}
                                </button>
                                {isRight ? (
                                  <span />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => removeSet(ex, s)}
                                    disabled={pending}
                                    aria-label={hasRight ? "Satz (beide Seiten) entfernen" : "Satz entfernen"}
                                    className="h-10 w-6 text-[15px]"
                                    style={{ color: "color-mix(in srgb, var(--dc-text) 40%, transparent)" }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          });
                        })()}

                        {renderNotes(
                          ex.itemId,
                          ex.noteKey,
                          <>
                            {ex.isTest ? (
                              <button type="button" className="btn btn-secondary" onClick={() => addSet(ex.itemId, "arbeitssatz")}>
                                + Versuch
                              </button>
                            ) : (
                              <>
                                <button type="button" className="btn btn-secondary" onClick={() => addSet(ex.itemId, "aufwaermsatz")}>
                                  + Aufwärmsatz
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => addSet(ex.itemId, "arbeitssatz")}>
                                  + Arbeitssatz
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {canAddExercises && (
              <div className="mt-6.5" style={{ marginTop: 26 }}>
                <datalist id="session-exercise-library-options">
                  {exerciseLibrary.map((e) => (
                    <option key={e.id} value={e.name} />
                  ))}
                </datalist>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={addExerciseName}
                    onChange={(e) => setAddExerciseName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addExercise();
                      }
                    }}
                    placeholder="Übung hinzufügen — z. B. Kniebeuge"
                    list="session-exercise-library-options"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isAddingExercise || !addExerciseName.trim()}
                    onClick={addExercise}
                  >
                    {isAddingExercise ? "…" : "+ Hinzufügen"}
                  </button>
                </div>
              </div>
            )}

            {cardio.map((c) => {
              const value = cardioResults[c.itemId] ?? "";
              const dirty = value.trim() !== (savedCardioResults[c.itemId] ?? "");
              return (
                <div
                  key={c.itemId}
                  className="p-3.5"
                  style={{ background: "var(--dc-surface)", border: "1px solid var(--dc-divider)", marginTop: 26 }}
                >
                  <div className="kicker-accent-2">Cardio</div>
                  <div className="mt-1.5 text-[17px] font-semibold leading-tight" style={{ fontFamily: "var(--dc-font-heading)" }}>
                    {c.name}
                    {c.spec ? <span className="font-normal"> — {c.spec}</span> : null}
                  </div>
                  {(c.on || c.off || c.note) && (
                    <div className="mt-1 text-[13px]" style={{ color: "var(--dc-muted)" }}>
                      {c.on && `On ${c.on} Belastung`}
                      {c.off && ` · Off ${c.off} Pause`}
                      {c.note && ` · ${c.note}`}
                    </div>
                  )}
                  <SelfNoteReminder note={notes[c.itemId]?.self ?? null} />
                  <div className="field mt-3" style={{ margin: 0, marginTop: 12 }}>
                    <label htmlFor={`cardio-result-${c.itemId}`}>Ergebnis</label>
                    <div className="flex gap-2">
                      <input
                        id={`cardio-result-${c.itemId}`}
                        className="input flex-1"
                        value={value}
                        onChange={(e) => setCardioResults((prev) => ({ ...prev, [c.itemId]: e.target.value }))}
                        onBlur={() => saveCardioResult(c.itemId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveCardioResult(c.itemId);
                          }
                        }}
                        placeholder="z. B. 7 Runden, 5,2 km, 18:40 min"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary flex-none"
                        disabled={!dirty || savingCardioId === c.itemId}
                        onClick={() => saveCardioResult(c.itemId)}
                      >
                        {savingCardioId === c.itemId ? "…" : !dirty && value.trim() ? "✓ Gespeichert" : "Speichern"}
                      </button>
                    </div>
                  </div>
                  <CardioScreenshotField athleteId={athleteId} itemId={c.itemId} initialUrl={c.screenshotUrl} />
                  {renderNotes(c.itemId, c.noteKey)}
                </div>
              );
            })}
          </>
        ) : (
          <div className="mt-3.5">
            <div className="text-[13px]" style={{ color: "var(--dc-muted)" }}>
              {karateRows.length} {karateRows.length === 1 ? "Übung" : "Übungen"}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {karateRows.map((row) => (
                <div key={row.itemId} className="p-4" style={{ background: "var(--dc-surface)" }}>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="text-[17px] leading-[1.25]">{row.name}</div>
                      <div className="mt-1 text-xs" style={{ color: "var(--dc-muted)" }}>
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
                  <SelfNoteReminder note={notes[row.itemId]?.self ?? null} />
                  {renderNotes(row.itemId, row.noteKey)}
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
              <span className="text-[13px]" style={{ color: "var(--dc-muted)" }}>
                {pad.field === "reps"
                  ? "Wiederholungen"
                  : pad.field === "contact"
                    ? "Kontaktzeit"
                    : pad.field === "rsi"
                      ? "RSI (leer lassen = wird berechnet)"
                      : pad.isTest
                        ? "Messwert"
                        : "Gewicht"}
              </span>
              <button type="button" className="btn btn-ghost" onClick={() => setPad(null)}>
                Abbrechen
              </button>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[44px] leading-none">{pad.buffer || "0"}</span>
              <span className="text-base" style={{ color: "var(--dc-muted)" }}>
                {pad.unit}
              </span>
            </div>
            {pad.suggestion && (
              <div className="mt-1 text-xs" style={{ color: "var(--dc-muted)" }}>
                {pad.isTest ? "Bisher bester Wert" : "Letztes Training"}: {pad.suggestion} {pad.unit}
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

      {vbtPad &&
        (() => {
          const ex = exercises.find((e) => e.itemId === vbtPad.itemId);
          const loss = velocityLoss(parseDecimal(vbtPad.best), parseDecimal(vbtPad.last));
          const limit = ex?.vbt?.lossLimit ?? null;
          return (
            <div
              className="fixed inset-0 z-50 flex flex-col justify-end"
              style={{ background: "color-mix(in srgb, #201e1d 45%, transparent)" }}
              onClick={() => setVbtPad(null)}
            >
              <div
                className="mx-auto w-full max-w-[420px] p-4.5 pb-6.5"
                style={{ background: "var(--dc-surface)", borderRadius: "14px 14px 0 0", boxShadow: "var(--dc-shadow-lg)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px]" style={{ color: "var(--dc-muted)" }}>
                    Hantelgeschwindigkeit (mittlere, m/s)
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => setVbtPad(null)}>
                    Überspringen
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="field">
                    <span className="text-xs" style={{ color: "var(--dc-muted)" }}>
                      Schnellste Wdh.
                    </span>
                    <input
                      className="input text-[20px]"
                      inputMode="decimal"
                      autoFocus
                      placeholder="0,62"
                      value={vbtPad.best}
                      onChange={(e) => setVbtPad({ ...vbtPad, best: e.target.value.replace(/[^0-9.,]/g, "") })}
                    />
                  </label>
                  <label className="field">
                    <span className="text-xs" style={{ color: "var(--dc-muted)" }}>
                      Letzte Wdh. (optional)
                    </span>
                    <input
                      className="input text-[20px]"
                      inputMode="decimal"
                      placeholder="0,51"
                      value={vbtPad.last}
                      onChange={(e) => setVbtPad({ ...vbtPad, last: e.target.value.replace(/[^0-9.,]/g, "") })}
                    />
                  </label>
                </div>
                {loss != null && (
                  <p
                    className="mt-2 text-[13px]"
                    style={{ color: limit != null && loss > limit ? "#b45309" : "var(--dc-muted)" }}
                  >
                    Geschwindigkeitsverlust {String(loss).replace(".", ",")} %
                    {limit != null && loss > limit ? ` · über der Grenze von ${limit} %: nächsten Satz leichter oder kürzer` : ""}
                  </p>
                )}
                <button type="button" className="btn btn-primary btn-block mt-3.5" onClick={saveVbt}>
                  Speichern
                </button>
              </div>
            </div>
          );
        })()}

      {rirPad && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "color-mix(in srgb, #201e1d 45%, transparent)" }} onClick={() => setRirPad(null)}>
          <div
            className="mx-auto w-full max-w-[420px] p-4.5 pb-6.5"
            style={{ background: "var(--dc-surface)", borderRadius: "14px 14px 0 0", boxShadow: "var(--dc-shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[13px]" style={{ color: "var(--dc-muted)" }}>
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
            <div className="mt-2 text-[13px] leading-[1.5]" style={{ color: "var(--dc-muted)" }}>
              Belastungsempfinden für das ganze Training — {RPE_WORDS[rpeValue ?? 5]}.
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
            <div className="mt-2 flex justify-between text-[11px]" style={{ color: "var(--dc-muted)" }}>
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
          const instrExerciseId = ex?.exerciseId ?? row?.exerciseId;
          const instr = instrExerciseId ? instructionsByExercise[instrExerciseId] : undefined;
          const title = ex?.name ?? row?.name ?? "";
          const steps = instr?.steps ?? [];
          const fallbackNote = ex?.note ?? row?.note ?? row?.desc ?? "";
          const linkUrl = instr?.video_url || ex?.linkUrl || row?.linkUrl || "";
          const linkLabel = instr?.video_url
            ? instr.video_label || "Video ansehen"
            : /youtube\.com|youtu\.be|vimeo\.com/i.test(linkUrl)
              ? "Video ansehen"
              : "Link öffnen";
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
                    <p className="text-sm leading-[1.5]" style={{ color: "var(--dc-muted)" }}>
                      {fallbackNote || "Noch keine Anweisung vom Trainer hinterlegt."}
                    </p>
                  )}
                </div>
                {linkUrl && (
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-between gap-3 p-3.5 no-underline"
                    style={{ background: "var(--dc-surface)", borderLeft: "2px solid var(--dc-accent)" }}
                  >
                    <span className="text-sm" style={{ color: "var(--dc-text)" }}>
                      {linkLabel}
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
