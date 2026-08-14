"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { upsertFeedbackAction } from "@/lib/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotebookTextIcon } from "lucide-react";

type Item = {
  id: string;
  exercise_name: string;
  reps_or_duration: string | null;
  sets: string | null;
  notes: string | null;
};

type FeedbackMap = Record<string, { done: boolean; actual_value: string }>;

export function PlanFeedbackTable({
  items,
  initialFeedback,
}: {
  items: Item[];
  initialFeedback: FeedbackMap;
}) {
  const [feedback, setFeedback] = useState<FeedbackMap>(initialFeedback);
  const [notesOpenId, setNotesOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function getRow(id: string) {
    return feedback[id] ?? { done: false, actual_value: "" };
  }

  function toggleDone(id: string, done: boolean) {
    setFeedback((prev) => ({ ...prev, [id]: { ...getRow(id), done } }));
    startTransition(async () => {
      const result = await upsertFeedbackAction(id, { done });
      if (result.error) toast.error(result.error);
    });
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

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="w-8 p-2" />
            <th className="p-2 text-left font-medium">Übung</th>
            <th className="p-2 text-left font-medium">Anzahl / Dauer</th>
            <th className="p-2 text-left font-medium">Sätze</th>
            <th className="p-2 text-left font-medium">Hinweise</th>
            <th className="p-2 text-left font-medium">Ist-Wert / Notiz</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const row = getRow(item.id);
            return (
              <tr key={item.id} className={`border-t ${row.done ? "bg-muted/30" : ""}`}>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.done}
                    onChange={(e) => toggleDone(item.id, e.target.checked)}
                    aria-label="Erledigt"
                  />
                </td>
                <td className={`p-2 ${row.done ? "line-through text-muted-foreground" : ""}`}>
                  {item.exercise_name}
                </td>
                <td className="p-2">{item.reps_or_duration || "—"}</td>
                <td className="p-2">{item.sets || "—"}</td>
                <td className="p-2">
                  {item.notes ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesOpenId(item.id)}
                    >
                      <NotebookTextIcon /> Hinweise
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
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
    </div>
  );
}
