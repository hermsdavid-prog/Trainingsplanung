"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEventAction } from "@/lib/actions/events";
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

const COLOR_OPTIONS = [
  { value: "#f97316", label: "Orange" },
  { value: "#ef4444", label: "Rot" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#0ea5e9", label: "Blau" },
  { value: "#10b981", label: "Grün" },
  { value: "#a855f7", label: "Violett" },
];

export function CreateEventDialog({
  defaultDate,
  groups,
  athletes,
}: {
  defaultDate: string;
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const [allDay, setAllDay] = useState(true);
  const [target, setTarget] = useState<"none" | "group" | "athlete">("none");
  const [repeats, setRepeats] = useState(false);
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await createEventAction({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        eventType: String(formData.get("event_type") ?? ""),
        color: String(formData.get("color") ?? "#f97316"),
        date: String(formData.get("date") ?? ""),
        time: String(formData.get("time") ?? ""),
        allDay,
        groupId: target === "group" ? String(formData.get("group_id") ?? "") || null : null,
        athleteId:
          target === "athlete" ? String(formData.get("athlete_id") ?? "") || null : null,
        repeatUntil: repeats ? String(formData.get("repeat_until") ?? "") || null : null,
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
      <DialogTrigger render={<Button>Neuer Termin</Button>} />
      <DialogContent className="sm:max-w-md">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Neuer Termin</DialogTitle>
            <DialogDescription>
              Wettkampf, Meeting oder sonstiger Termin für Gruppen oder einzelne Athleten.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Titel</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="event_type">Typ</Label>
            <Input id="event_type" name="event_type" placeholder="z. B. Wettkampf, Meeting" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Datum</Label>
            <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            Ganztägig
          </label>

          {!allDay && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Uhrzeit</Label>
              <Input id="time" name="time" type="time" />
            </div>
          )}

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

          <div className="flex flex-col gap-2">
            <Label>Für wen?</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={target === "none"}
                  onChange={() => setTarget("none")}
                />
                Alle
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={target === "group"}
                  onChange={() => setTarget("group")}
                />
                Gruppe
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={target === "athlete"}
                  onChange={() => setTarget("athlete")}
                />
                Athlet
              </label>
            </div>
          </div>

          {target === "group" && (
            <Select
              name="group_id"
              required
              items={Object.fromEntries(groups.map((g) => [g.id, g.name]))}
            >
              <SelectTrigger className="w-full">
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
          )}

          {target === "athlete" && (
            <Select
              name="athlete_id"
              required
              items={Object.fromEntries(athletes.map((a) => [a.id, a.full_name]))}
            >
              <SelectTrigger className="w-full">
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
          )}

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
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Wird angelegt…" : "Termin anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
