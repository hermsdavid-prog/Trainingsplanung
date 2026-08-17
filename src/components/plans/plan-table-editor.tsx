"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { savePlanItemsAction } from "@/lib/actions/plans";
import {
  ExerciseSetEntryDialog,
  type ExerciseSet,
} from "@/components/athletik/exercise-set-entry-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2Icon, NotebookTextIcon, LinkIcon, PlusIcon, DumbbellIcon } from "lucide-react";

type Section = "kraft" | "cardio";

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
};

const EXERCISE_LIST_ID = "exercise-library-options";

export function PlanTableEditor({
  planId,
  initialItems,
  exerciseLibrary = [],
  categoryLabel,
  trackResults = false,
  planDate,
}: {
  planId: string;
  initialItems: Row[];
  exerciseLibrary?: { id: string; name: string }[];
  categoryLabel?: string | null;
  trackResults?: boolean;
  planDate?: string;
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.length > 0
      ? initialItems.map((r) => ({ ...EMPTY_ROW, ...r }))
      : [{ ...EMPTY_ROW, section: "kraft" }]
  );
  const [notesOpenIndex, setNotesOpenIndex] = useState<number | null>(null);
  const [linkOpenIndex, setLinkOpenIndex] = useState<number | null>(null);
  const [resultsOpenIndex, setResultsOpenIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAthletik = categoryLabel?.trim().toLowerCase() === "athletik";
  const nameByLowercase = new Map(exerciseLibrary.map((e) => [e.name.toLowerCase(), e]));

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [field]: value };
        if (field === "exercise_name" && row.section === "kraft") {
          const match = nameByLowercase.get(value.trim().toLowerCase());
          next.exercise_id = match?.id ?? row.exercise_id ?? null;
        }
        return next;
      })
    );
  }

  function addRow(section: Section) {
    setRows((prev) => [...prev, { ...EMPTY_ROW, section }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await savePlanItemsAction(planId, rows);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Rows lacking an exercise_id (a not-yet-catalogued exercise name) get
      // one auto-created server-side — sync it back so the "Ergebnis" dialog
      // becomes usable immediately, without reloading the page. Server
      // positions are indexed over the non-empty rows only, in the same
      // order, matching what was just sent to savePlanItemsAction.
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

      toast.success("Übungstabelle gespeichert.");
    });
  }

  const kraftRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isAthletik || row.section === "kraft");
  const cardioRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.section === "cardio");

  return (
    <div className="flex flex-col gap-6">
      {isAthletik && (
        <datalist id={EXERCISE_LIST_ID}>
          {exerciseLibrary.map((e) => (
            <option key={e.id} value={e.name} />
          ))}
        </datalist>
      )}

      <div className="flex flex-col gap-3">
        {isAthletik && <h3 className="text-sm font-semibold">Kraft</h3>}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">Übung</th>
                {isAthletik && trackResults && (
                  <th className="p-2 text-left font-medium">Ergebnis</th>
                )}
                <th className="p-2 text-left font-medium">Anzahl / Dauer</th>
                <th className="p-2 text-left font-medium">Sätze</th>
                <th className="p-2 text-left font-medium">Pause</th>
                <th className="p-2 text-left font-medium">Hinweise / Link</th>
                <th className="w-8 p-2" />
              </tr>
            </thead>
            <tbody>
              {kraftRows.map(({ row, index }) => (
                <tr key={index} className="border-t">
                  <td className="p-2">
                    <Input
                      value={row.exercise_name}
                      onChange={(e) => updateRow(index, "exercise_name", e.target.value)}
                      placeholder="z. B. Kniebeuge"
                      className="min-w-36"
                      list={isAthletik ? EXERCISE_LIST_ID : undefined}
                    />
                  </td>
                  {isAthletik && trackResults && (
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setResultsOpenIndex(index)}
                        disabled={!row.exercise_name.trim()}
                      >
                        <DumbbellIcon />
                        {row.result_sets && row.result_sets.length > 0
                          ? `${row.result_sets.length} Satz${row.result_sets.length > 1 ? "e" : ""}`
                          : "Ergebnis"}
                      </Button>
                    </td>
                  )}
                  <td className="p-2">
                    <Input
                      value={row.reps_or_duration}
                      onChange={(e) => updateRow(index, "reps_or_duration", e.target.value)}
                      placeholder="z. B. 10 Wdh. / 30 Sek."
                      className="min-w-32"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.sets}
                      onChange={(e) => updateRow(index, "sets", e.target.value)}
                      placeholder="z. B. 4"
                      className="w-20"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={row.rest_time}
                      onChange={(e) => updateRow(index, "rest_time", e.target.value)}
                      placeholder="z. B. 60 Sek."
                      className="w-24"
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNotesOpenIndex(index)}
                        aria-label="Hinweise"
                      >
                        <NotebookTextIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLinkOpenIndex(index)}
                        aria-label="Link"
                        className={row.link_url ? "border-primary text-primary" : undefined}
                      >
                        <LinkIcon />
                      </Button>
                    </div>
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRow(index)}
                      aria-label="Zeile entfernen"
                    >
                      <Trash2Icon />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAthletik && trackResults && (
          <p className="text-xs text-muted-foreground">
            Trage bei Übungen aus der Athletik-Bibliothek Wiederholungen und Gewicht je Satz
            ein — das wird für die Fortschrittskurve gespeichert. Bei einer neuen Übung zuerst
            die Übungstabelle speichern, danach lässt sich das Ergebnis erfassen.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => addRow("kraft")}
        >
          <PlusIcon /> Übung hinzufügen
        </Button>
      </div>

      {isAthletik && (
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
                  <th className="w-8 p-2" />
                </tr>
              </thead>
              <tbody>
                {cardioRows.map(({ row, index }) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">
                      <Input
                        value={row.exercise_name}
                        onChange={(e) => updateRow(index, "exercise_name", e.target.value)}
                        placeholder="z. B. Laufband"
                        className="min-w-36"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.reps_or_duration}
                        onChange={(e) => updateRow(index, "reps_or_duration", e.target.value)}
                        placeholder="z. B. 80 % / 5 min"
                        className="min-w-32"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.rest_time}
                        onChange={(e) => updateRow(index, "rest_time", e.target.value)}
                        placeholder="z. B. 60 Sek."
                        className="w-24"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.sets}
                        onChange={(e) => updateRow(index, "sets", e.target.value)}
                        placeholder="z. B. 4"
                        className="w-20"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.round_rest}
                        onChange={(e) => updateRow(index, "round_rest", e.target.value)}
                        placeholder="z. B. 90 Sek."
                        className="w-24"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.heart_rate_on}
                        onChange={(e) => updateRow(index, "heart_rate_on", e.target.value)}
                        placeholder="z. B. 160"
                        className="w-24"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.heart_rate_off}
                        onChange={(e) => updateRow(index, "heart_rate_off", e.target.value)}
                        placeholder="z. B. 120"
                        className="w-24"
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNotesOpenIndex(index)}
                          aria-label="Hinweise"
                        >
                          <NotebookTextIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setLinkOpenIndex(index)}
                          aria-label="Link"
                          className={row.link_url ? "border-primary text-primary" : undefined}
                        >
                          <LinkIcon />
                        </Button>
                      </div>
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRow(index)}
                        aria-label="Zeile entfernen"
                      >
                        <Trash2Icon />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => addRow("cardio")}
          >
            <PlusIcon /> Übung hinzufügen
          </Button>
        </div>
      )}

      <Button type="button" onClick={handleSave} disabled={isPending} className="self-end">
        {isPending ? "Wird gespeichert…" : "Übungstabelle speichern"}
      </Button>

      <Dialog
        open={notesOpenIndex !== null}
        onOpenChange={(open) => !open && setNotesOpenIndex(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Hinweise{" "}
              {notesOpenIndex !== null &&
                rows[notesOpenIndex]?.exercise_name &&
                `— ${rows[notesOpenIndex].exercise_name}`}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={8}
            value={notesOpenIndex !== null ? rows[notesOpenIndex]?.notes ?? "" : ""}
            onChange={(e) =>
              notesOpenIndex !== null && updateRow(notesOpenIndex, "notes", e.target.value)
            }
            placeholder="Ausführliche Erklärung zur Übung, Technikhinweise, Zielsetzung …"
          />
          <DialogFooter>
            <Button onClick={() => setNotesOpenIndex(null)}>Übernehmen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpenIndex !== null} onOpenChange={(open) => !open && setLinkOpenIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Link{" "}
              {linkOpenIndex !== null &&
                rows[linkOpenIndex]?.exercise_name &&
                `— ${rows[linkOpenIndex].exercise_name}`}
            </DialogTitle>
          </DialogHeader>
          <Input
            type="url"
            value={linkOpenIndex !== null ? rows[linkOpenIndex]?.link_url ?? "" : ""}
            onChange={(e) =>
              linkOpenIndex !== null && updateRow(linkOpenIndex, "link_url", e.target.value)
            }
            placeholder="z. B. https://youtube.com/…"
          />
          <DialogFooter>
            <Button onClick={() => setLinkOpenIndex(null)}>Übernehmen</Button>
          </DialogFooter>
        </DialogContent>
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
                i === idx
                  ? { ...row, result_sets: sets.filter((s) => s.weight.trim()), result_unit: unit }
                  : row
              )
            );
          }}
        />
      )}
    </div>
  );
}
