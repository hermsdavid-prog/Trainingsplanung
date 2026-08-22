"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { savePlanItemsAction, updatePlanMetaAction } from "@/lib/actions/plans";
import { upsertExerciseInstructionsAction } from "@/lib/actions/exercise-instructions";
import { formatDateShort } from "@/lib/date";
import {
  ExerciseSetEntryDialog,
  type ExerciseSet,
} from "@/components/athletik/exercise-set-entry-dialog";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";
import { Trash2Icon, NotebookTextIcon, LinkIcon, PlusIcon, DumbbellIcon } from "lucide-react";

type Section = "kraft" | "cardio" | "sprung" | "runden";
type DurationMode = "reps" | "duration";

type Row = {
  exercise_name: string;
  reps_or_duration: string;
  sets: string;
  rest_time: string;
  notes: string;
  link_url: string;
  exercise_id?: string | null;
  result_sets?: ExerciseSet[];
  result_unit?: string;
  section: Section;
  round_rest: string;
  heart_rate_on: string;
  heart_rate_off: string;
  description: string;
  duration_mode: DurationMode;
  instruction_steps: string[];
  instruction_video_url: string;
};

const EMPTY_ROW: Omit<Row, "section"> = {
  exercise_name: "",
  reps_or_duration: "",
  sets: "",
  rest_time: "",
  notes: "",
  link_url: "",
  exercise_id: null,
  result_sets: [],
  result_unit: "kg",
  round_rest: "",
  heart_rate_on: "",
  heart_rate_off: "",
  description: "",
  duration_mode: "reps",
  instruction_steps: [],
  instruction_video_url: "",
};

const EXERCISE_LIST_ID = "exercise-library-options";

const SPRUNG_VORSCHLAEGE = "CMJ Sprunghöhe, Standweitsprung, 20-m-Sprint";

export function PlanTableEditor({
  planId,
  initialItems,
  exerciseLibrary = [],
  categoryLabel,
  trackResults = false,
  initialTitle = "",
  initialDate = "",
  initialTime = "",
  kicker,
  subtitle,
  badges,
  backHref,
  headerActions,
}: {
  planId: string;
  initialItems: Row[];
  exerciseLibrary?: { id: string; name: string }[];
  categoryLabel?: string | null;
  trackResults?: boolean;
  initialTitle?: string;
  initialDate?: string;
  initialTime?: string | null;
  kicker?: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  backHref?: string;
  headerActions?: ReactNode;
}) {
  const isAthletik = categoryLabel?.trim().toLowerCase() === "athletik";

  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((r) => ({ ...EMPTY_ROW, ...r }))
      : [{ ...EMPTY_ROW, section: isAthletik ? "kraft" : "runden" }]
  );
  const [title, setTitle] = useState(initialTitle);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime ?? "");
  const [notesOpenIndex, setNotesOpenIndex] = useState<number | null>(null);
  const [linkOpenIndex, setLinkOpenIndex] = useState<number | null>(null);
  const [resultsOpenIndex, setResultsOpenIndex] = useState<number | null>(null);
  const [instrOpenIndex, setInstrOpenIndex] = useState<number | null>(null);
  const [stepDraftByIndex, setStepDraftByIndex] = useState<Record<number, string>>({});
  const [instrSaving, setInstrSaving] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const planDate = date;

  const nameByLowercase = new Map(exerciseLibrary.map((e) => [e.name.toLowerCase(), e]));

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [field]: value };
        if (field === "exercise_name" && (row.section === "kraft" || row.section === "runden")) {
          const match = nameByLowercase.get(value.trim().toLowerCase());
          next.exercise_id = match?.id ?? row.exercise_id ?? null;
        }
        return next;
      })
    );
  }

  function toggleDurationMode(index: number) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              duration_mode: row.duration_mode === "duration" ? "reps" : "duration",
              reps_or_duration: "",
            }
          : row
      )
    );
  }

  function addRow(section: Section) {
    setRows((prev) => [...prev, { ...EMPTY_ROW, section }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  // Single "Plan zuweisen" action for the whole editor — saves the
  // rahmendaten (title/date/time) and the exercise rows together instead of
  // the old two separate "Rahmendaten speichern" / "Übungstabelle speichern"
  // buttons.
  function handleAssign() {
    startTransition(async () => {
      const metaResult = await updatePlanMetaAction(planId, { title, date, time });
      if (metaResult.error) {
        toast.error(metaResult.error);
        return;
      }

      const result = await savePlanItemsAction(planId, rows);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const savedItems = result.items;
      if (savedItems) {
        const nonEmptyIndices = rows.reduce<number[]>((acc, r, i) => {
          if (r.exercise_name.trim()) acc.push(i);
          return acc;
        }, []);
        setRows((prev) => {
          const next = [...prev];
          for (const item of savedItems) {
            const rowIndex = nonEmptyIndices[item.position];
            if (rowIndex === undefined) continue;
            next[rowIndex] = {
              ...next[rowIndex],
              exercise_id: item.exercise_id ?? next[rowIndex].exercise_id ?? null,
            };
          }
          return next;
        });
      }

      toast.success("Plan zugewiesen.");
    });
  }

  // exercise_instructions is keyed by exercise_id and shared across every
  // plan that references the exercise, so edits here save immediately
  // (matching the design's onChange-only instructions panel) instead of
  // waiting for the "Plan zuweisen" button.
  async function saveInstructions(
    index: number,
    patch: { steps?: string[]; video_url?: string }
  ) {
    const row = rows[index];
    if (!row.exercise_id) return;
    setInstrSaving(index);
    const result = await upsertExerciseInstructionsAction(row.exercise_id, {
      steps: patch.steps ?? row.instruction_steps,
      video_url: patch.video_url ?? row.instruction_video_url,
    });
    setInstrSaving(null);
    if (result.error) toast.error(result.error);
  }

  function addStep(index: number) {
    const draft = (stepDraftByIndex[index] ?? "").trim();
    if (!draft) return;
    const nextSteps = [...rows[index].instruction_steps, draft];
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, instruction_steps: nextSteps } : row)));
    setStepDraftByIndex((prev) => ({ ...prev, [index]: "" }));
    saveInstructions(index, { steps: nextSteps });
  }

  function editStep(index: number, stepIndex: number, value: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? { ...row, instruction_steps: row.instruction_steps.map((s, si) => (si === stepIndex ? value : s)) }
          : row
      )
    );
  }

  function removeStep(index: number, stepIndex: number) {
    const nextSteps = rows[index].instruction_steps.filter((_, si) => si !== stepIndex);
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, instruction_steps: nextSteps } : row)));
    saveInstructions(index, { steps: nextSteps });
  }

  const kraftRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isAthletik || row.section === "kraft");
  const cardioRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.section === "cardio");
  const sprungRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.section === "sprung");
  const rundenRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isAthletik && row.section !== "cardio");

  const kickerClass = isAthletik ? "kicker" : "kicker-accent-2";
  const rundenSummary = `${rundenRows.length} ${rundenRows.length === 1 ? "Übung" : "Übungen"}`;

  return (
    <div className="flex flex-col gap-8">
      {exerciseLibrary.length > 0 && (
        <datalist id={EXERCISE_LIST_ID}>
          {exerciseLibrary.map((e) => (
            <option key={e.id} value={e.name} />
          ))}
        </datalist>
      )}

      <div>
        {backHref && (
          <Link href={backHref} className="btn btn-ghost" style={{ marginBottom: 14 }}>
            ← Zurück
          </Link>
        )}
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
          <div style={{ minWidth: 0, flex: 1 }}>
            {kicker && <div className={kickerClass}>{kicker}</div>}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel des Trainings"
              className="mt-2 w-full max-w-[600px] bg-transparent"
              style={{
                border: 0,
                borderBottom: "1px solid var(--dc-divider)",
                fontFamily: "var(--dc-font-heading)",
                fontWeight: 600,
                fontSize: 32,
                lineHeight: 1.05,
                color: "var(--dc-text)",
                padding: "0 0 6px",
              }}
            />
            {subtitle && (
              <p className="mt-2.5 text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                {subtitle}
              </p>
            )}
            {!isAthletik && <p className="mt-1 text-[13px] text-muted">{rundenSummary}</p>}
            {badges && <div className="mt-2 flex items-center gap-2">{badges}</div>}
          </div>
          <div className="flex flex-none items-center gap-2">
            {headerActions}
            <button type="button" className="btn btn-primary" onClick={handleAssign} disabled={isPending}>
              {isPending ? "Wird zugewiesen…" : "Plan zuweisen"}
            </button>
          </div>
        </div>

        <div className="mt-5.5 flex flex-wrap items-start gap-6" style={{ marginTop: 22 }}>
          <div className="field" style={{ width: 170, margin: 0 }}>
            <label htmlFor="plan-date">Datum{date ? ` · ${formatDateShort(date)}` : ""}</label>
            <input
              id="plan-date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field" style={{ width: 110, margin: 0 }}>
            <label htmlFor="plan-time">Uhrzeit</label>
            <input
              id="plan-time"
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder={isAthletik ? "17:30" : "19:15"}
            />
          </div>
        </div>
      </div>

      {isAthletik && (
        <>
          <div>
            <div className="kicker-muted mb-2">Kraft</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Übung</th>
                  {trackResults && <th>Ergebnis</th>}
                  <th>Anzahl / Dauer</th>
                  <th>Sätze</th>
                  <th>Pause</th>
                  <th>Hinweise / Link</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {kraftRows.map(({ row, index }) => (
                  <tr key={index}>
                    <td>
                      <input
                        className="input min-w-36"
                        value={row.exercise_name}
                        onChange={(e) => updateRow(index, "exercise_name", e.target.value)}
                        placeholder="z. B. Kniebeuge"
                        list={EXERCISE_LIST_ID}
                      />
                    </td>
                    {trackResults && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setResultsOpenIndex(index)}
                          disabled={!row.exercise_name.trim()}
                        >
                          <DumbbellIcon />
                          {row.result_sets && row.result_sets.length > 0
                            ? `${row.result_sets.length} ${row.result_sets.length > 1 ? "Sätze" : "Satz"}`
                            : "Ergebnis"}
                        </button>
                      </td>
                    )}
                    <td>
                      <input
                        className="input min-w-32"
                        value={row.reps_or_duration}
                        onChange={(e) => updateRow(index, "reps_or_duration", e.target.value)}
                        placeholder="z. B. 10 Wdh. / 30 Sek."
                      />
                    </td>
                    <td>
                      <input
                        className="input w-20"
                        value={row.sets}
                        onChange={(e) => updateRow(index, "sets", e.target.value)}
                        placeholder="z. B. 4"
                      />
                    </td>
                    <td>
                      <input
                        className="input w-24"
                        value={row.rest_time}
                        onChange={(e) => updateRow(index, "rest_time", e.target.value)}
                        placeholder="z. B. 60 Sek."
                      />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          onClick={() => setNotesOpenIndex(index)}
                          aria-label="Hinweise"
                        >
                          <NotebookTextIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          onClick={() => setLinkOpenIndex(index)}
                          aria-label="Link"
                          style={row.link_url ? { borderColor: "var(--dc-accent)", color: "var(--dc-accent)" } : undefined}
                        >
                          <LinkIcon />
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeRow(index)}
                        aria-label="Zeile entfernen"
                      >
                        <Trash2Icon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {trackResults && (
              <p className="mt-2 text-xs text-muted">
                Trage bei Übungen aus der Athletik-Bibliothek Wiederholungen und Gewicht je Satz ein —
                das wird für die Fortschrittskurve gespeichert. Bei einer neuen Übung zuerst den
                Plan zuweisen, danach lässt sich das Ergebnis erfassen.
              </p>
            )}

            <button type="button" className="btn btn-secondary mt-3" onClick={() => addRow("kraft")}>
              <PlusIcon /> Übung hinzufügen
            </button>
          </div>

          <div>
            <div className="kicker-accent-2 mb-2">Cardio</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Übung</th>
                  <th>Belastung</th>
                  <th>Pause</th>
                  <th>Runden</th>
                  <th>Rundenpause</th>
                  <th>HF on</th>
                  <th>HF off</th>
                  <th>Hinweise / Link</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {cardioRows.map(({ row, index }) => (
                  <tr key={index}>
                    <td>
                      <input
                        className="input min-w-36"
                        value={row.exercise_name}
                        onChange={(e) => updateRow(index, "exercise_name", e.target.value)}
                        placeholder="z. B. Laufband"
                      />
                    </td>
                    <td>
                      <input
                        className="input min-w-32"
                        value={row.reps_or_duration}
                        onChange={(e) => updateRow(index, "reps_or_duration", e.target.value)}
                        placeholder="z. B. 80 % / 5 min"
                      />
                    </td>
                    <td>
                      <input
                        className="input w-24"
                        value={row.rest_time}
                        onChange={(e) => updateRow(index, "rest_time", e.target.value)}
                        placeholder="z. B. 60 Sek."
                      />
                    </td>
                    <td>
                      <input
                        className="input w-20"
                        value={row.sets}
                        onChange={(e) => updateRow(index, "sets", e.target.value)}
                        placeholder="z. B. 4"
                      />
                    </td>
                    <td>
                      <input
                        className="input w-24"
                        value={row.round_rest}
                        onChange={(e) => updateRow(index, "round_rest", e.target.value)}
                        placeholder="z. B. 90 Sek."
                      />
                    </td>
                    <td>
                      <input
                        className="input w-24"
                        value={row.heart_rate_on}
                        onChange={(e) => updateRow(index, "heart_rate_on", e.target.value)}
                        placeholder="z. B. 160"
                      />
                    </td>
                    <td>
                      <input
                        className="input w-24"
                        value={row.heart_rate_off}
                        onChange={(e) => updateRow(index, "heart_rate_off", e.target.value)}
                        placeholder="z. B. 120"
                      />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          onClick={() => setNotesOpenIndex(index)}
                          aria-label="Hinweise"
                        >
                          <NotebookTextIcon />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          onClick={() => setLinkOpenIndex(index)}
                          aria-label="Link"
                          style={row.link_url ? { borderColor: "var(--dc-accent)", color: "var(--dc-accent)" } : undefined}
                        >
                          <LinkIcon />
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeRow(index)}
                        aria-label="Zeile entfernen"
                      >
                        <Trash2Icon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button type="button" className="btn btn-secondary mt-3" onClick={() => addRow("cardio")}>
              <PlusIcon /> Übung hinzufügen
            </button>
          </div>

          <div>
            <div className="kicker-accent-2 mb-2">Leistungsdiagnostik</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Versuche</th>
                  <th>Messgröße</th>
                  <th>Pause</th>
                  <th>Hinweise</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {sprungRows.map(({ row, index }) => (
                  <tr key={index}>
                    <td>
                      <input
                        className="input min-w-36"
                        value={row.exercise_name}
                        onChange={(e) => updateRow(index, "exercise_name", e.target.value)}
                        placeholder="z. B. CMJ Sprunghöhe"
                      />
                    </td>
                    <td>
                      <input
                        className="input w-20"
                        value={row.sets}
                        onChange={(e) => updateRow(index, "sets", e.target.value)}
                        placeholder="3"
                      />
                    </td>
                    <td>
                      <input
                        className="input w-24"
                        value={row.reps_or_duration}
                        onChange={(e) => updateRow(index, "reps_or_duration", e.target.value)}
                        placeholder="cm"
                      />
                    </td>
                    <td>
                      <input
                        className="input w-24"
                        value={row.rest_time}
                        onChange={(e) => updateRow(index, "rest_time", e.target.value)}
                        placeholder="0:45"
                      />
                    </td>
                    <td>
                      <input
                        className="input min-w-32"
                        value={row.notes}
                        onChange={(e) => updateRow(index, "notes", e.target.value)}
                        placeholder="Ausführung, Absprunghöhe"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeRow(index)}
                        aria-label="Zeile entfernen"
                      >
                        <Trash2Icon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn btn-secondary mt-3" onClick={() => addRow("sprung")}>
              <PlusIcon /> weiterer Test
            </button>
            <p className="mt-2.5 max-w-[620px] text-xs leading-[1.6] text-muted">
              Übliche Tests: {SPRUNG_VORSCHLAEGE} — der beste Versuch geht in die Statistik.
            </p>
          </div>
        </>
      )}

      {!isAthletik && (
        <div>
          <div className="flex flex-col gap-3.5">
            {rundenRows.map(({ row, index }) => {
              const stepCount = row.instruction_steps.length;
              return (
                <div key={index} style={{ border: "1px solid var(--dc-divider)" }}>
                  <div
                    className="items-end gap-3"
                    style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px 90px 40px", padding: 16 }}
                  >
                    <div className="field" style={{ margin: 0 }}>
                      <label>Übung</label>
                      <input
                        className="input"
                        value={row.exercise_name}
                        onChange={(e) => updateRow(index, "exercise_name", e.target.value)}
                        placeholder="z. B. Kihon — Gyaku-Zuki"
                        list={EXERCISE_LIST_ID}
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>{row.duration_mode === "duration" ? "Dauer" : "Wiederholungen"}</label>
                      <input
                        className="input"
                        value={row.reps_or_duration}
                        onChange={(e) => updateRow(index, "reps_or_duration", e.target.value)}
                        placeholder={row.duration_mode === "duration" ? "0:30" : "10"}
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Runden</label>
                      <input
                        className="input"
                        value={row.sets}
                        onChange={(e) => updateRow(index, "sets", e.target.value)}
                        placeholder="3"
                      />
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>Pause</label>
                      <input
                        className="input"
                        value={row.rest_time}
                        onChange={(e) => updateRow(index, "rest_time", e.target.value)}
                        placeholder="1:00"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeRow(index)}
                      aria-label="Übung entfernen"
                    >
                      <Trash2Icon />
                    </button>
                  </div>
                  <div
                    className="items-end gap-3"
                    style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "0 16px 16px" }}
                  >
                    <div className="field" style={{ margin: 0 }}>
                      <label>Beschreibung</label>
                      <input
                        className="input"
                        value={row.description}
                        onChange={(e) => updateRow(index, "description", e.target.value)}
                        placeholder="Worum es in dieser Übung geht"
                      />
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={() => toggleDurationMode(index)}>
                      {row.duration_mode === "duration" ? "Auf Wiederholungen umstellen" : "Auf Dauer umstellen"}
                    </button>
                  </div>
                  <div
                    className="items-center justify-between gap-3"
                    style={{ display: "flex", padding: "12px 16px", background: "var(--dc-surface)" }}
                  >
                    <span className="text-xs text-muted">
                      {stepCount} Schritt{stepCount === 1 ? "" : "e"}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setInstrOpenIndex(instrOpenIndex === index ? null : index)}
                    >
                      Anweisung und Link
                    </button>
                  </div>
                  {instrOpenIndex === index && (
                    <div style={{ padding: "18px 16px 20px", borderTop: "1px solid var(--dc-divider)" }}>
                      {!row.exercise_id ? (
                        <p className="text-xs text-muted">
                          Zuerst den Plan zuweisen, danach lässt sich die Anweisung hinterlegen.
                        </p>
                      ) : (
                        <>
                          <div className="kicker-muted">Schritt für Schritt</div>
                          <div className="mt-2.5">
                            {row.instruction_steps.map((s, si) => (
                              <div
                                key={si}
                                className="items-center gap-2.5"
                                style={{ display: "grid", gridTemplateColumns: "22px 1fr 40px", padding: "5px 0" }}
                              >
                                <span
                                  className="text-sm font-semibold"
                                  style={{ fontFamily: "var(--dc-font-heading)", color: "var(--dc-accent)" }}
                                >
                                  {si + 1}
                                </span>
                                <input
                                  className="input"
                                  value={s}
                                  onChange={(e) => editStep(index, si, e.target.value)}
                                  onBlur={() => saveInstructions(index, {})}
                                />
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => removeStep(index, si)}
                                  aria-label="Schritt entfernen"
                                >
                                  <Trash2Icon />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="items-end gap-2" style={{ display: "flex", marginTop: 12 }}>
                            <div className="field" style={{ flex: 1, margin: 0 }}>
                              <label>Schritt hinzufügen</label>
                              <input
                                className="input"
                                value={stepDraftByIndex[index] ?? ""}
                                onChange={(e) =>
                                  setStepDraftByIndex((prev) => ({ ...prev, [index]: e.target.value }))
                                }
                                placeholder="Ein Satz, eine Bewegung"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addStep(index);
                                  }
                                }}
                              />
                            </div>
                            <button type="button" className="btn btn-secondary" onClick={() => addStep(index)}>
                              Hinzufügen
                            </button>
                          </div>
                          <div className="field" style={{ marginTop: 18 }}>
                            <label>Link zum Video</label>
                            <input
                              className="input"
                              value={row.instruction_video_url}
                              onChange={(e) => updateRow(index, "instruction_video_url", e.target.value)}
                              onBlur={() => saveInstructions(index, {})}
                              placeholder="https://"
                            />
                          </div>
                          {instrSaving === index && (
                            <p className="mt-1.5 text-xs text-muted">Wird gespeichert…</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-secondary mt-4" onClick={() => addRow("runden")}>
            <PlusIcon /> Übung hinzufügen
          </button>
        </div>
      )}

      <Dialog open={notesOpenIndex !== null} onOpenChange={(open) => !open && setNotesOpenIndex(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton={false} className="dc-dialog max-w-[480px]">
            <div className="kicker-muted">
              Hinweise{" "}
              {notesOpenIndex !== null && rows[notesOpenIndex]?.exercise_name && `— ${rows[notesOpenIndex].exercise_name}`}
            </div>
            <textarea
              className="input mt-2"
              rows={8}
              value={notesOpenIndex !== null ? rows[notesOpenIndex]?.notes ?? "" : ""}
              onChange={(e) => notesOpenIndex !== null && updateRow(notesOpenIndex, "notes", e.target.value)}
              placeholder="Ausführliche Erklärung zur Übung, Technikhinweise, Zielsetzung …"
            />
            <button type="button" className="btn btn-primary self-start" onClick={() => setNotesOpenIndex(null)}>
              Übernehmen
            </button>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={linkOpenIndex !== null} onOpenChange={(open) => !open && setLinkOpenIndex(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton={false} className="dc-dialog max-w-[440px]">
            <div className="kicker-muted">
              Link {linkOpenIndex !== null && rows[linkOpenIndex]?.exercise_name && `— ${rows[linkOpenIndex].exercise_name}`}
            </div>
            <input
              className="input mt-2"
              type="url"
              value={linkOpenIndex !== null ? rows[linkOpenIndex]?.link_url ?? "" : ""}
              onChange={(e) => linkOpenIndex !== null && updateRow(linkOpenIndex, "link_url", e.target.value)}
              placeholder="z. B. https://youtube.com/…"
            />
            <button type="button" className="btn btn-primary self-start" onClick={() => setLinkOpenIndex(null)}>
              Übernehmen
            </button>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {resultsOpenIndex !== null && planDate && (
        <ExerciseSetEntryDialog
          key={resultsOpenIndex}
          open={resultsOpenIndex !== null}
          onOpenChange={(open) => !open && setResultsOpenIndex(null)}
          exerciseName={rows[resultsOpenIndex].exercise_name}
          exerciseId={rows[resultsOpenIndex].exercise_id ?? null}
          planId={planId}
          planDate={planDate}
          initialSets={rows[resultsOpenIndex].result_sets ?? []}
          initialUnit={rows[resultsOpenIndex].result_unit}
          suggestedSetCount={Number(rows[resultsOpenIndex].sets) || 1}
          onSaved={(sets, unit) => {
            const idx = resultsOpenIndex;
            setRows((prev) =>
              prev.map((row, i) =>
                i === idx ? { ...row, result_sets: sets.filter((s) => s.weight.trim()), result_unit: unit } : row
              )
            );
          }}
        />
      )}
    </div>
  );
}
