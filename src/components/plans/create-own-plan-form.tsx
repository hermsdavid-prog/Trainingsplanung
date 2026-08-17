"use client";

import { useActionState } from "react";
import { createOwnPlanAction, type ActionResult } from "@/lib/actions/plans";
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

export function CreateOwnPlanForm() {
  const [state, formAction, isPending] = useActionState(createOwnPlanAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="category_label">Typ</Label>
        <Select
          name="category_label"
          defaultValue={PLAN_TYPES[0]}
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
        <p className="text-xs text-muted-foreground">
          Bei &bdquo;Athletik&rdquo; gliedert sich die Übungstabelle in die Bereiche Kraft und
          Cardio; Kraftübungen stehen aus einer Bibliothek mit Vorschlägen zur Verfügung, und
          die Ergebnisse können als Fortschrittskurve verfolgt werden.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="date">Datum</Label>
        <Input id="date" name="date" type="date" required />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Wird angelegt…" : "Weiter zur Übungstabelle"}
      </Button>
    </form>
  );
}
