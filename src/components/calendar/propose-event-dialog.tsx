"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { proposeEventAction } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function ProposeEventDialog({
  defaultDate,
  groups,
}: {
  defaultDate: string;
  groups: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await proposeEventAction({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        date: String(formData.get("date") ?? ""),
        groupId: String(formData.get("group_id") ?? ""),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Termin vorschlagen</Button>} />
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Termin vorschlagen</DialogTitle>
            <DialogDescription>
              Dein Trainer sieht den Vorschlag und kann ihn bestätigen.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Titel</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Datum</Label>
            <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group_id">Betrifft Gruppe</Label>
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
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Wird gesendet…" : "Vorschlag senden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
