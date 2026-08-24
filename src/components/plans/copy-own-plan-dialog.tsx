"use client";

import { useActionState, useState } from "react";
import { copyPlanForAthleteAction, type ActionResult } from "@/lib/actions/plans";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
} from "@/components/ui/dialog";

const initialState: ActionResult = {};

// The athlete-facing counterpart to CopyPlanDialog — no "für wen?" choice,
// since the copy always lands as a new personal plan for the athlete
// themselves, whether the source was their own training or one assigned to
// their group.
export function CopyOwnPlanDialog({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(copyPlanForAthleteAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Training kopieren
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[420px]">
          <form action={formAction} className="flex flex-col">
            <div className="kicker-muted">Training kopieren</div>
            <p className="mt-2 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
              Legt eine Kopie dieses Trainings als eigenes Training auf ein neues Datum an.
            </p>
            <input type="hidden" name="source_plan_id" value={planId} />

            <div className="field mt-4">
              <label htmlFor="copy-own-date">Neues Datum</label>
              <input id="copy-own-date" name="date" type="date" required className="input" />
            </div>

            {state.error && (
              <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
                {state.error}
              </div>
            )}

            <div className="mt-[18px] flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? "Wird kopiert…" : "Kopieren"}
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
