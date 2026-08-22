"use client";

import { useActionState, useState } from "react";
import { copyPlanAction, type ActionResult } from "@/lib/actions/plans";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
} from "@/components/ui/dialog";

const initialState: ActionResult = {};

export function CopyPlanDialog({
  planId,
  groups,
  athletes,
}: {
  planId: string;
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [scopeType, setScopeType] = useState<"group" | "athlete">("group");
  const [state, formAction, isPending] = useActionState(copyPlanAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Plan kopieren
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[460px]">
          <form action={formAction} className="flex flex-col">
            <div className="kicker-muted">Plan kopieren</div>
            <p className="mt-2 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
              Erstellt eine Kopie dieses Plans (als Entwurf) auf ein neues Datum.
            </p>
            <input type="hidden" name="source_plan_id" value={planId} />

            <div className="field mt-4">
              <label htmlFor="copy-date">Neues Datum</label>
              <input id="copy-date" name="date" type="date" required className="input" />
            </div>

            <div className="mt-3.5">
              <span className="mb-1.5 block text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 70%, transparent)" }}>
                Für wen?
              </span>
              <div className="seg">
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="scope_type"
                    value="group"
                    checked={scopeType === "group"}
                    onChange={() => setScopeType("group")}
                  />
                  Gruppe
                </label>
                <label className="seg-opt">
                  <input
                    type="radio"
                    name="scope_type"
                    value="athlete"
                    checked={scopeType === "athlete"}
                    onChange={() => setScopeType("athlete")}
                  />
                  Einzelner Athlet
                </label>
              </div>
            </div>

            {scopeType === "group" ? (
              <div className="field mt-3.5">
                <label htmlFor="copy-group">Gruppe</label>
                <select id="copy-group" name="group_id" required className="input" defaultValue="">
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
            ) : (
              <div className="field mt-3.5">
                <label htmlFor="copy-athlete">Athlet</label>
                <select id="copy-athlete" name="athlete_id" required className="input" defaultValue="">
                  <option value="" disabled>
                    Athlet wählen
                  </option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
