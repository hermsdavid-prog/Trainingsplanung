"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateMesocycleAction, deleteMesocycleAction } from "@/lib/actions/mesocycles";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";

export type MesocycleEditable = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  weeks: number;
};

export function EditMesocycleDialog({ mesocycle }: { mesocycle: MesocycleEditable }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(mesocycle.title);
  const [description, setDescription] = useState(mesocycle.description ?? "");
  const [startDate, setStartDate] = useState(mesocycle.start_date);
  const [weeks, setWeeks] = useState(String(mesocycle.weeks));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateMesocycleAction(mesocycle.id, { title, description, startDate, weeks: Number(weeks) });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Mesozyklus gespeichert.");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Diesen Mesozyklus wirklich löschen? Zugeordnete Trainingseinheiten bleiben erhalten, verlieren aber die Zuordnung.")) return;
    startTransition(async () => {
      const result = await deleteMesocycleAction(mesocycle.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Mesozyklus gelöscht.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Bearbeiten
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[420px]">
          <div className="flex flex-col">
            <div className="kicker-muted">Mesozyklus bearbeiten</div>

            <div className="field mt-3.5">
              <label htmlFor="edit-mesocycle-title">Titel</label>
              <input id="edit-mesocycle-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="field mt-3">
              <label htmlFor="edit-mesocycle-description">Beschreibung</label>
              <textarea
                id="edit-mesocycle-description"
                className="input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-3 flex gap-3">
              <div className="field flex-1">
                <label htmlFor="edit-mesocycle-start">Startdatum</label>
                <input
                  id="edit-mesocycle-start"
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="field" style={{ width: 110 }}>
                <label htmlFor="edit-mesocycle-weeks">Wochen</label>
                <input
                  id="edit-mesocycle-weeks"
                  type="number"
                  min={1}
                  className="input"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
                {error}
              </div>
            )}

            <div className="mt-[18px] flex gap-2">
              <button type="button" className="btn btn-primary" disabled={isPending} onClick={handleSave}>
                {isPending ? "Wird gespeichert…" : "Speichern"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-danger" style={{ marginLeft: "auto" }} disabled={isPending} onClick={handleDelete}>
                Löschen
              </button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
