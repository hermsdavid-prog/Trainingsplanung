"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { upsertFeedbackAction } from "@/lib/actions/feedback";
import {
  ExerciseSetEntryDialog,
  type ExerciseSet,
} from "@/components/athletik/exercise-set-entry-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotebookTextIcon, LinkIcon, DumbbellIcon } from "lucide-react";

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
    return (
      <p className="text-sm text-muted-foreground">
        Für diesen Plan wurden noch keine Übungen eingetragen.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {isAthletik && <h3 className="text-sm font-semibold">Kraft</h3>}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">Übung</th>
                {isAthletik && <th className="p-2 text-left font-medium">Ergebnis</th>}
                <th className="p-2 text-left font-medium">Anzahl / Dauer</th>
                <th className="p-2 text-left font-medium">Sätze</th>
                <th className="p-2 text-left font-medium">Pause</th>
                <th className="p-2 text-left font-medium">Hinweise / Link</th>
                <th className="p-2 text-left font-medium">Ist-Wert / Notiz</th>
              </tr>
            </thead>
            <tbody>
              {kraftItems.map((item) => {
                const row = getRow(item.id);
                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-2">{item.exercise_name}</td>
                    {isAthletik && (
                      <td className="p-2">
                        {item.exercise_id ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setResultsOpenId(item.id)}
                          >
                            <DumbbellIcon />
                            {getResult(item.exercise_id).sets.length > 0
                              ? `${getResult(item.exercise_id).sets.length} Satz${getResult(item.exercise_id).sets.length > 1 ? "e" : ""}`
                              : "Ergebnis"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                    <td className="p-2">{item.reps_or_duration || "—"}</td>
                    <td className="p-2">{item.sets || "—"}</td>
                    <td className="p-2">{item.rest_time || "—"}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {item.notes ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNotesOpenId(item.id)}
                          >
                            <NotebookTextIcon /> Hinweise
                          </Button>
                        ) : null}
                        {item.link_url ? (
                          <a
                            href={item.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
                          >
                            <LinkIcon className="size-3.5" /> Link
                          </a>
                        ) : null}
                        {!item.notes && !item.link_url && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.actual_value}
                        onChange={(e) => updateActualValue(item.id, e.target.value)}
                        onBlur={() => saveActualValue(item.id)}
                        placeholder="z. B. tatsächliche Wiederholungen"
                        className="min-w-40"
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
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Cardio</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Übung</th>
                  <th className="p-2 text-left font-medium">Belastung</th>
                  <th className="p-2 text-left font-medium">Pause</th>
                  <th className="p-2 text-left font-medium">Runden</th>
                  <th className="p-2 text-left font-medium">Rundenpause</th>
                  <th className="p-2 text-left font-medium">Herzfrequenz (on)</th>
                  <th className="p-2 text-left font-medium">Herzfrequenz (off)</th>
                  <th className="p-2 text-left font-medium">Hinweise / Link</th>
                  <th className="p-2 text-left font-medium">Ist-Wert / Notiz</th>
                </tr>
              </thead>
              <tbody>
                {cardioItems.map((item) => {
                  const row = getRow(item.id);
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.exercise_name}</td>
                      <td className="p-2">{item.reps_or_duration || "—"}</td>
                      <td className="p-2">{item.rest_time || "—"}</td>
                      <td className="p-2">{item.sets || "—"}</td>
                      <td className="p-2">{item.round_rest || "—"}</td>
                      <td className="p-2">{item.heart_rate_on || "—"}</td>
                      <td className="p-2">{item.heart_rate_off || "—"}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          {item.notes ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNotesOpenId(item.id)}
                            >
                              <NotebookTextIcon /> Hinweise
                            </Button>
                          ) : null}
                          {item.link_url ? (
                            <a
                              href={item.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
                            >
                              <LinkIcon className="size-3.5" /> Link
                            </a>
                          ) : null}
                          {!item.notes && !item.link_url && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.actual_value}
                          onChange={(e) => updateActualValue(item.id, e.target.value)}
                          onBlur={() => saveActualValue(item.id)}
                          placeholder="z. B. gefühlte Anstrengung"
                          className="min-w-40"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hinweise {notesItem && `— ${notesItem.exercise_name}`}
            </DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm">{notesItem?.notes}</p>
        </DialogContent>
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
