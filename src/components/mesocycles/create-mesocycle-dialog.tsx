"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMesocycleAction } from "@/lib/actions/mesocycles";
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from "@/components/ui/dialog";

// The page no longer imposes a single Gruppe/Athlet scope (it shows every
// Mesozyklus at once), so the target — scope, then group or athlete — is
// picked entirely inside this dialog instead of coming from the page.
export function CreateMesocycleDialog({
  groups,
  athletes,
  defaultGroupId,
  defaultAthleteId,
}: {
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
  defaultGroupId?: string;
  defaultAthleteId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scopeType, setScopeType] = useState<"group" | "athlete">("group");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [weeks, setWeeks] = useState("6");
  const [groupId, setGroupId] = useState(defaultGroupId ?? groups[0]?.id ?? "");
  const [athleteId, setAthleteId] = useState(defaultAthleteId ?? athletes[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setScopeType("group");
    setTitle("");
    setDescription("");
    setStartDate("");
    setWeeks("6");
    setGroupId(defaultGroupId ?? groups[0]?.id ?? "");
    setAthleteId(defaultAthleteId ?? athletes[0]?.id ?? "");
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    const targetId = scopeType === "group" ? groupId : athleteId;
    if (!targetId) {
      setError(scopeType === "group" ? "Bitte eine Gruppe wählen." : "Bitte einen Athleten wählen.");
      return;
    }
    startTransition(async () => {
      const result = await createMesocycleAction({
        title,
        description,
        startDate,
        weeks: Number(weeks),
        scopeType,
        targetId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Mesozyklus angelegt.");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Mesozyklus anlegen
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[420px]">
          <div className="flex flex-col">
            <div className="kicker-muted">Mesozyklus anlegen</div>

            <div className="seg mt-3.5">
              <label className="seg-opt">
                <input type="radio" name="create-mesocycle-scope" checked={scopeType === "group"} onChange={() => setScopeType("group")} />
                Gruppe
              </label>
              <label className="seg-opt">
                <input type="radio" name="create-mesocycle-scope" checked={scopeType === "athlete"} onChange={() => setScopeType("athlete")} />
                Einzelner Athlet
              </label>
            </div>

            {scopeType === "group" ? (
              <div className="field mt-3.5">
                <label htmlFor="mesocycle-group">Gruppe</label>
                <select id="mesocycle-group" className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="field mt-3.5">
                <label htmlFor="mesocycle-athlete">Athlet</label>
                {athletes.length === 0 ? (
                  <p className="text-sm text-muted">Noch kein Athlet zugeordnet.</p>
                ) : (
                  <select id="mesocycle-athlete" className="input" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
                    {athletes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="field mt-3.5">
              <label htmlFor="mesocycle-title">Titel</label>
              <input
                id="mesocycle-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z. B. Kraftaufbau"
              />
            </div>

            <div className="field mt-3">
              <label htmlFor="mesocycle-description">Beschreibung</label>
              <textarea
                id="mesocycle-description"
                className="input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z. B. Kraftaufbau und Grundlagenausdauer-Training"
              />
            </div>

            <div className="mt-3 flex gap-3">
              <div className="field flex-1">
                <label htmlFor="mesocycle-start">Startdatum</label>
                <input
                  id="mesocycle-start"
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="field" style={{ width: 110 }}>
                <label htmlFor="mesocycle-weeks">Wochen</label>
                <input
                  id="mesocycle-weeks"
                  type="number"
                  min={1}
                  className="input"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
                {error}
              </div>
            )}

            <div className="mt-[18px] flex gap-2">
              <button type="button" className="btn btn-primary" disabled={isPending} onClick={handleSubmit}>
                {isPending ? "Wird angelegt…" : "Anlegen"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
