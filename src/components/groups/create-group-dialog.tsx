"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroupAction } from "@/lib/actions/groups";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
} from "@/components/ui/dialog";

const COLOR_OPTIONS = [
  { value: "#0088b0", label: "Blau" },
  { value: "#d6006c", label: "Magenta" },
  { value: "#10b981", label: "Grün" },
  { value: "#f59e0b", label: "Orange" },
  { value: "#4b3793", label: "Violett" },
];

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setError(undefined);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createGroupAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button type="button" className="btn btn-primary" onClick={() => handleOpenChange(true)}>
        Gruppe anlegen
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[480px]">
          <form action={handleSubmit} className="flex flex-col">
            <div className="kicker-muted">Neue Gruppe anlegen</div>
            <p className="mt-2 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
              Z. B. Karate-Kata, Karate-Kumite, Einzellauf, Paarlauf, Eistanz.
            </p>
            <div className="field mt-4">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" required className="input" />
            </div>
            <div className="field mt-3.5">
              <label htmlFor="short_name">Kürzel (optional)</label>
              <input id="short_name" name="short_name" maxLength={8} className="input w-24" placeholder="z. B. KU" />
              <p className="mt-1.5 text-xs text-muted">Erscheint im Kalender statt des vollen Gruppennamens.</p>
            </div>
            <div className="field mt-3.5">
              <label htmlFor="description">Rhythmus (optional)</label>
              <input id="description" name="description" className="input" placeholder="z. B. 3 Einheiten pro Woche" />
            </div>
            <div className="mt-3.5">
              <label className="mb-1.5 block text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 70%, transparent)" }}>
                Farbe
              </label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c, i) => (
                  <label key={c.value} className="flex items-center gap-1">
                    <input type="radio" name="color" value={c.value} defaultChecked={i === 0} className="sr-only peer" />
                    <span
                      className="size-6 cursor-pointer rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-foreground"
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  </label>
                ))}
              </div>
            </div>
            {error && (
              <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
                {error}
              </div>
            )}
            <div className="mt-[18px] flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? "Wird angelegt…" : "Gruppe anlegen"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Abbrechen
              </button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
