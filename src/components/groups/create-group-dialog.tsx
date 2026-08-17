"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroupAction } from "@/lib/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const COLOR_OPTIONS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#0ea5e9", label: "Blau" },
  { value: "#10b981", label: "Grün" },
  { value: "#f59e0b", label: "Orange" },
  { value: "#ef4444", label: "Rot" },
  { value: "#a855f7", label: "Violett" },
];

export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createGroupAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(undefined);
      }}
    >
      <DialogTrigger render={<Button>Neue Gruppe anlegen</Button>} />
      <DialogContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Neue Gruppe anlegen</DialogTitle>
            <DialogDescription>
              Z. B. Karate-Kata, Karate-Kumite, Einzellauf, Paarlauf, Eistanz.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="short_name">Kürzel (optional)</Label>
            <Input id="short_name" name="short_name" maxLength={8} className="w-24" placeholder="z. B. KU" />
            <p className="text-xs text-muted-foreground">
              Erscheint im Kalender statt des vollen Gruppennamens.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="color">Farbe</Label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c, i) => (
                <label key={c.value} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="color"
                    value={c.value}
                    defaultChecked={i === 0}
                    className="sr-only peer"
                  />
                  <span
                    className="size-6 cursor-pointer rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-foreground"
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Wird angelegt…" : "Gruppe anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
