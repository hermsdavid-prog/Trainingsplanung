"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteGroupAction,
  setGroupAthleteAction,
  setGroupTrainerAction,
  updateGroupAction,
} from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Person = { id: string; full_name: string };

export function GroupDetailDialog({
  group,
  trainers,
  athletes,
  assignedTrainerIds,
  assignedAthleteIds,
  canDelete,
}: {
  group: { id: string; name: string; description: string | null; color: string };
  trainers: Person[];
  athletes: Person[];
  assignedTrainerIds: string[];
  assignedAthleteIds: string[];
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | undefined>();
  const router = useRouter();

  function toggleTrainer(trainerId: string, checked: boolean) {
    startTransition(async () => {
      const result = await setGroupTrainerAction(group.id, trainerId, checked);
      if (result.error) setSaveError(result.error);
      router.refresh();
    });
  }

  function toggleAthlete(athleteId: string, checked: boolean) {
    startTransition(async () => {
      const result = await setGroupAthleteAction(group.id, athleteId, checked);
      if (result.error) setSaveError(result.error);
      router.refresh();
    });
  }

  async function handleUpdate(formData: FormData): Promise<void> {
    formData.set("group_id", group.id);
    const result = await updateGroupAction({}, formData);
    if (result.error) setSaveError(result.error);
    router.refresh();
  }

  function handleDelete() {
    if (!confirm(`Gruppe "${group.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      const result = await deleteGroupAction(group.id);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Verwalten</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group.name}</DialogTitle>
        </DialogHeader>

        <form action={handleUpdate} className="flex flex-col gap-3 border-b pb-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`name-${group.id}`}>Name</Label>
            <Input id={`name-${group.id}`} name="name" defaultValue={group.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`desc-${group.id}`}>Beschreibung</Label>
            <Textarea
              id={`desc-${group.id}`}
              name="description"
              rows={2}
              defaultValue={group.description ?? ""}
            />
          </div>
          <input type="hidden" name="color" value={group.color} />
          <Button type="submit" variant="secondary" size="sm" className="self-start">
            Speichern
          </Button>
        </form>

        <div className="flex flex-col gap-2 border-b pb-4">
          <Label>Trainer</Label>
          <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
            {trainers.length === 0 && (
              <p className="text-sm text-muted-foreground">Noch keine Trainer angelegt.</p>
            )}
            {trainers.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={assignedTrainerIds.includes(t.id)}
                  disabled={isPending}
                  onChange={(e) => toggleTrainer(t.id, e.target.checked)}
                />
                {t.full_name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Athleten</Label>
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
            {athletes.length === 0 && (
              <p className="text-sm text-muted-foreground">Noch keine Athleten angelegt.</p>
            )}
            {athletes.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={assignedAthleteIds.includes(a.id)}
                  disabled={isPending}
                  onChange={(e) => toggleAthlete(a.id, e.target.checked)}
                />
                {a.full_name}
              </label>
            ))}
          </div>
        </div>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        <DialogFooter className={canDelete ? "sm:justify-between" : undefined}>
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              Gruppe löschen
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
