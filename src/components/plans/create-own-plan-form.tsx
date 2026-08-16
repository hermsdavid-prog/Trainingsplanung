"use client";

import { useActionState } from "react";
import { createOwnPlanAction, type ActionResult } from "@/lib/actions/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionResult = {};

export function CreateOwnPlanForm() {
  const [state, formAction, isPending] = useActionState(createOwnPlanAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" placeholder="z. B. Eigenes Techniktraining" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category_label">Oberkategorie</Label>
        <Input
          id="category_label"
          name="category_label"
          placeholder="z. B. Athletik, Technik, Ausdauer"
          list="category-options"
        />
        <datalist id="category-options">
          <option value="Athletik" />
          <option value="Technik" />
          <option value="Ausdauer" />
          <option value="Beweglichkeit" />
        </datalist>
        <p className="text-xs text-muted-foreground">
          Bei der Kategorie &bdquo;Athletik&rdquo; steht beim Eintragen der Übungen eine
          Übungsbibliothek mit Vorschlägen zur Verfügung, und die Ergebnisse können als
          Fortschrittskurve verfolgt werden.
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
