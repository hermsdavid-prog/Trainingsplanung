"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { upsertFeedbackAction } from "@/lib/actions/feedback";
import {
  ExerciseSetEntryDialog,
  type ExerciseSet,
} from "@/components/athletik/exercise-set-entry-dialog";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";
import { DumbbellIcon } from "lucide-react";

type Item = {
  id: string;
  exercise_name: string;
  reps_or_duration: string | null;
  sets: string | null;
  rest_time?: string | null;
  notes: string | null;
  link_url?: string | null;
  exercise_id?: string | null;
  section?: string;
  round_rest?: string | null;
  heart_rate_on?: string | null;
  heart_rate_off?: string | null;
};

type FeedbackMap = Record<string, { actual_value: string }>;
type ResultEntry = { sets: ExerciseSet[]; unit: string };
type ResultMap = Record<string, ResultEntry>;

export function PlanFeedbackTable({
  items,
  initialFeedback,
  categoryLabel,
  planId,
  planDate,
  initialResults = {},
}: {
  items: Item[];
  initialFeedback: FeedbackMap;
  categoryLabel?: string | null;
  planId?: string;
  planDate?: string;
  initialResults?: ResultMap;
}) {
  const [feedback, setFeedback] = useState<FeedbackMap>(initialFeedback);
  const [results, setResults] = useState<ResultMap>(initialResults);
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null);
  const [resultsOpenId, setResultsOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isAthletik = categoryLabel?.trim().toLowerCase() === "athletik";

  function getRow(id: string) {
    return feedback[id] ?? { actual_value: "" };
  }

  function getResult(exerciseId: string): ResultEntry {
    return results[exerciseId] ?? { sets: [], unit: "kg" };
  }

  function updateActualValue(id: string, actual_value: string) {
    setFeedback((prev) => ({ ...prev, [id]: { ...getRow(id), actual_value } }));
  }

  function saveActualValue(id: string) {
    startTransition(async () => {
      const result = await upsertFeedbackAction(id, {
        actual_value: getRow(id).actual_value,
      });
      if (result.error) toast.error(result.error);
    });
  }

  const notesItem = items.find((i) => i.id === notesOpenId);
  const resultsItem = items.find((i) => i.id === resultsOpenId);

  const kraftItems = items.filter((i) => !isAthletik || i.section !== "cardio");
  const cardioItems = items.filter((i) => isAthletik && i.section === "cardio");

  if (items.length === 0) {
    return <p className="text-sm text-muted">Für diesen Plan wurden noch keine Übungen eingetragen.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        {isAthletik && <div className="kicker-muted mb-2">Kraft</div>}
        <div className="overflow-x-auto">
        <table className="table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>Übung</th>
              {isAthletik && <th>Ergebnis</th>}
              <th>Anzahl / Dauer</th>
              <th>Sätze</th>
              <th>Pause</th>
              <th>Hinweise / Link</th>
              <th>Ist-Wert / Notiz</th>
            </tr>
          </thead>
          <tbody>
            {kraftItems.map((item) => {
              const row = getRow(item.id);
              return (
                <tr key={item.id}>
                  <td className="text-[15px]">{item.exercise_name}</td>
                  {isAthletik && (
                    <td>
                      {item.exercise_id ? (
                        <button type="button" className="btn btn-secondary" onClick={() => setResultsOpenId(item.id)}>
                          <DumbbellIcon />
                          {getResult(item.exercise_id).sets.length > 0
                            ? `${getResult(item.exercise_id).sets.length} ${getResult(item.exercise_id).sets.length > 1 ? "Sätze" : "Satz"}`
                            : "Ergebnis"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  )}
                  <td>{item.reps_or_duration || "—"}</td>
                  <td>{item.sets || "—"}</td>
                  <td>{item.rest_time || "—"}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {item.notes && (
                        <button type="button" className="btn btn-ghost" onClick={() => setNotesOpenId(item.id)}>
                          Hinweise
                        </button>
                      )}
                      {item.link_url && (
                        <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                          Link
                        </a>
                      )}
                      {!item.notes && !item.link_url && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td>
                    <input
                      className="input min-w-40"
                      value={row.actual_value}
                      onChange={(e) => updateActualValue(item.id, e.target.value)}
                      onBlur={() => saveActualValue(item.id)}
                      placeholder="z. B. tatsächliche Wiederholungen"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {isAthletik && cardioItems.length > 0 && (
        <div>
          <div className="kicker-accent-2 mb-2">Cardio</div>
          <div className="overflow-x-auto">
          <table className="table" style={{ minWidth: 760 }}>
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
                <th>Ist-Wert / Notiz</th>
              </tr>
            </thead>
            <tbody>
              {cardioItems.map((item) => {
                const row = getRow(item.id);
                return (
                  <tr key={item.id}>
                    <td className="text-[15px]">{item.exercise_name}</td>
                    <td>{item.reps_or_duration || "—"}</td>
                    <td>{item.rest_time || "—"}</td>
                    <td>{item.sets || "—"}</td>
                    <td>{item.round_rest || "—"}</td>
                    <td>{item.heart_rate_on || "—"}</td>
                    <td>{item.heart_rate_off || "—"}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {item.notes && (
                          <button type="button" className="btn btn-ghost" onClick={() => setNotesOpenId(item.id)}>
                            Hinweise
                          </button>
                        )}
                        {item.link_url && (
                          <a href={item.link_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                            Link
                          </a>
                        )}
                        {!item.notes && !item.link_url && <span className="text-muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <input
                        className="input min-w-40"
                        value={row.actual_value}
                        onChange={(e) => updateActualValue(item.id, e.target.value)}
                        onBlur={() => saveActualValue(item.id)}
                        placeholder="z. B. gefühlte Anstrengung"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Dialog open={notesOpenId !== null} onOpenChange={(open) => !open && setNotesOpenId(null)}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton={false} className="dc-dialog max-w-[440px]">
            <div className="kicker-muted">Hinweise {notesItem && `— ${notesItem.exercise_name}`}</div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{notesItem?.notes}</p>
            <button type="button" className="btn btn-primary self-start" onClick={() => setNotesOpenId(null)}>
              Schließen
            </button>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {resultsItem && resultsItem.exercise_id && planId && planDate && (
        <ExerciseSetEntryDialog
          key={resultsOpenId}
          open={resultsOpenId !== null}
          onOpenChange={(open) => !open && setResultsOpenId(null)}
          exerciseName={resultsItem.exercise_name}
          exerciseId={resultsItem.exercise_id}
          planId={planId}
          planDate={planDate}
          initialSets={getResult(resultsItem.exercise_id).sets}
          initialUnit={getResult(resultsItem.exercise_id).unit}
          suggestedSetCount={Number(resultsItem.sets) || 1}
          onSaved={(sets, unit) => {
            setResults((prev) => ({
              ...prev,
              [resultsItem.exercise_id!]: { sets: sets.filter((s) => s.weight.trim()), unit },
            }));
          }}
        />
      )}
    </div>
  );
}
