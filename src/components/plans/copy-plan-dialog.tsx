"use client";

import { useActionState, useState } from "react";
import { copyPlanAction, type ActionResult } from "@/lib/actions/plans";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
      <DialogTrigger render={<Button variant="outline">Plan kopieren</Button>} />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Plan kopieren</DialogTitle>
            <DialogDescription>
              Erstellt eine Kopie dieses Plans (als Entwurf) auf ein neues Datum.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="source_plan_id" value={planId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="copy-date">Neues Datum</Label>
            <Input id="copy-date" name="date" type="date" required />
          </div>

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
              <Label htmlFor="copy-group">Gruppe</Label>
              <Select
                name="group_id"
                required
                items={Object.fromEntries(groups.map((g) => [g.id, g.name]))}
              >
                <SelectTrigger id="copy-group" className="w-full">
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
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="copy-athlete">Athlet</Label>
              <Select
                name="athlete_id"
                required
                items={Object.fromEntries(athletes.map((a) => [a.id, a.full_name]))}
              >
                <SelectTrigger id="copy-athlete" className="w-full">
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
            </div>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Wird kopiert…" : "Kopieren"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
