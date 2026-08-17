"use client";

import { useActionState } from "react";
import { updatePlanMetaAction, type ActionResult } from "@/lib/actions/plans";
import { PLAN_TYPES } from "@/lib/plan-type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: ActionResult = {};

export function PlanMetaForm({
  planId,
  categoryLabel,
  date,
}: {
  planId: string;
  categoryLabel: string;
  date: string;
}) {
  const [state, formAction, isPending] = useActionState(updatePlanMetaAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="plan_id" value={planId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category_label">Typ</Label>
        <Select
          name="category_label"
          defaultValue={categoryLabel}
          required
          items={Object.fromEntries(PLAN_TYPES.map((t) => [t, t]))}
        >
          <SelectTrigger id="category_label" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
