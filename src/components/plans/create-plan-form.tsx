"use client";

import { useActionState, useState } from "react";
import { createPlanAction, type ActionResult } from "@/lib/actions/plans";
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

export function CreatePlanForm({
  groups,
  athletes,
}: {
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(createPlanAction, initialState);
  const [scopeType, setScopeType] = useState<"group" | "athlete">("group");
  const [repeats, setRepeats] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" placeholder="z. B. Techniktraining" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category_label">Oberkategorie</Label>
        <Input
          id="category_label"
          name="category_label"
          placeholder="z. B. Kraft, Ausdauer, Technik"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="date">Datum</Label>
        <Input id="date" name="date" type="date" required />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={repeats}
          onChange={(e) => setRepeats(e.target.checked)}
        />
        Wiederholt sich wöchentlich
      </label>

      {repeats && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="repeat_until">Wiederholen bis</Label>
          <Input id="repeat_until" name="repeat_until" type="date" />
          <p className="text-xs text-muted-foreground">
            Legt für jede Woche bis zu diesem Datum einen eigenen Entwurf an. Die
            Übungstabelle, die du als Nächstes ausfüllst, wird automatisch auf alle noch
            leeren Termine der Serie übertragen.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Für wen?</Label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope_type"
              value="group"
              checked={scopeType === "group"}
              onChange={() => setScopeType("group")}
            />
            Gruppe
          </label>
          <label className="flex items-center gap-2">
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="group_id">Gruppe</Label>
          <Select
            name="group_id"
            required
            items={Object.fromEntries(groups.map((g) => [g.id, g.name]))}
          >
            <SelectTrigger id="group_id" className="w-full">
              <SelectValue placeholder="Gruppe wählen" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {groups.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Noch keine Gruppe vorhanden — lege zuerst eine Gruppe an.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="athlete_id">Athlet</Label>
          <Select
            name="athlete_id"
            required
            items={Object.fromEntries(athletes.map((a) => [a.id, a.full_name]))}
          >
            <SelectTrigger id="athlete_id" className="w-full">
              <SelectValue placeholder="Athlet wählen" />
            </SelectTrigger>
            <SelectContent>
              {athletes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {athletes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Noch kein Athlet in einer deiner Gruppen.
            </p>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Wird angelegt…" : "Weiter zur Übungstabelle"}
      </Button>
    </form>
  );
}
