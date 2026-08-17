"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upsertHealthLogAction } from "@/lib/actions/health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function HealthCheckinCard({
  date,
  initial,
}: {
  date: string;
  initial: { hrv: number | null; restingHr: number | null; wellbeing: number | null } | null;
}) {
  const [hrv, setHrv] = useState(initial?.hrv?.toString() ?? "");
  const [restingHr, setRestingHr] = useState(initial?.restingHr?.toString() ?? "");
  const [wellbeing, setWellbeing] = useState<number | null>(initial?.wellbeing ?? null);
  const [saved, setSaved] = useState(!!initial);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    if (!wellbeing) {
      toast.error("Bitte Wohlbefinden auswählen.");
      return;
    }
    startTransition(async () => {
      const result = await upsertHealthLogAction({ date, hrv, restingHr, wellbeing });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Gesundheitsdaten gespeichert.");
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Wie geht es dir heute?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="hrv">HRV (ms)</Label>
            <Input
              id="hrv"
              type="number"
              inputMode="decimal"
              value={hrv}
              onChange={(e) => {
                setHrv(e.target.value);
                setSaved(false);
              }}
              placeholder="optional"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="resting_hr">Ruheherzfrequenz (bpm)</Label>
            <Input
              id="resting_hr"
              type="number"
              inputMode="decimal"
              value={restingHr}
              onChange={(e) => {
                setRestingHr(e.target.value);
                setSaved(false);
              }}
              placeholder="optional"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Allgemeines Wohlbefinden (1 = schlecht, 10 = sehr gut)</Label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setWellbeing(n);
                  setSaved(false);
                }}
                className={cn(
                  "flex size-11 items-center justify-center rounded-md border text-sm transition-colors",
                  wellbeing === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending} className="self-start">
          {isPending ? "Wird gespeichert…" : saved ? "Aktualisieren" : "Speichern"}
        </Button>
      </CardContent>
    </Card>
  );
}
