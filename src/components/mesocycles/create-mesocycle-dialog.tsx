"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMesocycleAction } from "@/lib/actions/mesocycles";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";

export function CreateMesocycleDialog({
  scopeType,
  targetId,
}: {
  scopeType: "group" | "athlete";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [weeks, setWeeks] = useState("6");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setTitle("");
    setDescription("");
    setStartDate("");
    setWeeks("6");
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createMesocycleAction({
        title,
        description,
        startDate,
        weeks: Number(weeks),
        scopeType,
        targetId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Mesozyklus angelegt.");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Mesozyklus anlegen
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[420px]">
          <div className="flex flex-col">
            <div className="kicker-muted">Mesozyklus anlegen</div>

            <div className="field mt-3.5">
              <label htmlFor="mesocycle-title">Titel</label>
              <input
                id="mesocycle-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Kraftaufbau"
              />
            </div>

            <div className="field mt-3">
              <label htmlFor="mesocycle-description">Beschreibung</label>
              <textarea
                id="mesocycle-description"
                className="input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z. B. Kraftaufbau und Grundlagenausdauer-Training"
              />
            </div>

            <div className="mt-3 flex gap-3">
              <div className="field flex-1">
                <label htmlFor="mesocycle-start">Startdatum</label>
                <input
                  id="mesocycle-start"
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="field" style={{ width: 110 }}>
                <label htmlFor="mesocycle-weeks">Wochen</label>
                <input
                  id="mesocycle-weeks"
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
              <button type="button" className="btn btn-primary" disabled={isPending} onClick={handleSubmit}>
                {isPending ? "Wird angelegt…" : "Anlegen"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
