"use client";

import { useActionState } from "react";
import { updatePlanMetaAction, type ActionResult } from "@/lib/actions/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionResult = {};

export function PlanMetaForm({
  planId,
  title,
  categoryLabel,
  date,
}: {
  planId: string;
  title: string;
  categoryLabel: string | null;
  date: string;
}) {
  const [state, formAction, isPending] = useActionState(updatePlanMetaAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="plan_id" value={planId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" defaultValue={title} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category_label">Oberkategorie</Label>
        <Input
          id="category_label"
          name="category_label"
          defaultValue={categoryLabel ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">Datum</Label>
        <Input id="date" name="date" type="date" defaultValue={date} required />
      </div>
      <div className="flex items-end gap-2 sm:col-span-3">
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
          {isPending ? "Wird gespeichert…" : "Rahmendaten speichern"}
        </Button>
      </div>
    </form>
  );
}
