"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { proposeEventAction } from "@/lib/actions/events";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";

export function ProposeEventDialog({
  defaultDate,
  groups,
}: {
  defaultDate: string;
  groups: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await proposeEventAction({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        date,
        endDate: endDate || null,
        groupId: String(formData.get("group_id") ?? ""),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setEndDate("");
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Termin vorschlagen
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[460px]">
          <form action={handleSubmit} className="flex flex-col">
            <div className="kicker-muted">Termin vorschlagen</div>
            <p className="mt-2 text-[13px]" style={{ color: "var(--dc-muted)" }}>
              Dein Trainer sieht den Vorschlag und kann ihn bestätigen.
            </p>

            <div className="field mt-4">
              <label htmlFor="title">Titel</label>
              <input id="title" name="title" required className="input" />
            </div>
            <div className="field mt-3.5">
              <label htmlFor="description">Beschreibung</label>
              <textarea id="description" name="description" rows={2} className="input" />
            </div>
            <div className="mt-3.5 flex flex-wrap gap-3">
              <div className="field min-w-[140px] flex-1">
                <label htmlFor="date">Von</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  required
                  className="input"
                />
              </div>
              <div className="field min-w-[140px] flex-1">
                <label htmlFor="end_date">Bis (optional)</label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={endDate}
                  min={date}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs" style={{ color: "var(--dc-muted)" }}>
              Für mehrtägige Termine wie ein Trainingslager oder einen Wettkampf über mehrere Tage.
            </p>
            <div className="field mt-3.5">
              <label htmlFor="group_id">Betrifft Gruppe</label>
              <select id="group_id" name="group_id" required className="input" defaultValue="">
                <option value="" disabled>
                  Gruppe wählen
                </option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isPending} className="btn btn-primary btn-block">
              {isPending ? "Wird gesendet…" : "Vorschlag senden"}
            </button>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
