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
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await proposeEventAction({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        date: String(formData.get("date") ?? ""),
        groupId: String(formData.get("group_id") ?? ""),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
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
            <p className="mt-2 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
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
            <div className="field mt-3.5">
              <label htmlFor="date">Datum</label>
              <input id="date" name="date" type="date" defaultValue={defaultDate} required className="input" />
            </div>
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
