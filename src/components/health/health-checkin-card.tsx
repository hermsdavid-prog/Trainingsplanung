"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upsertHealthLogAction } from "@/lib/actions/health";
import { useCheckinSkip } from "@/components/health/checkin-gate";

export function HealthCheckinCard({ date }: { date: string }) {
  const [hrv, setHrv] = useState("");
  const [restingHr, setRestingHr] = useState("");
  const [wellbeing, setWellbeing] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const skip = useCheckinSkip();

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
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="kicker">Wohlbefinden</div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setWellbeing(n)}
            className="flex h-12 items-center justify-center text-[18px]"
            style={{
              border: "1px solid var(--dc-divider)",
              borderRadius: "var(--dc-radius-md)",
              background: wellbeing === n ? "var(--dc-accent)" : "transparent",
              color: wellbeing === n ? "var(--dc-bg)" : "var(--dc-text)",
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
        <span>1 · erschöpft</span>
        <span>10 · topfit</span>
      </div>

      <div className="mt-[18px] flex gap-3.5">
        <div className="field flex-1">
          <label htmlFor="hrv">HRV</label>
          <input
            id="hrv"
            className="input"
            inputMode="decimal"
            value={hrv}
            onChange={(e) => setHrv(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div className="field flex-1">
          <label htmlFor="resting_hr">Ruhe-HF</label>
          <input
            id="resting_hr"
            className="input"
            inputMode="decimal"
            value={restingHr}
            onChange={(e) => setRestingHr(e.target.value)}
            placeholder="optional"
          />
        </div>
      </div>

      <button type="button" onClick={handleSave} disabled={isPending} className="btn btn-primary btn-block">
        {isPending ? "Wird gespeichert…" : "Eintragen und weiter"}
      </button>
      {skip && (
        <button type="button" onClick={skip} disabled={isPending} className="btn btn-ghost btn-block">
          Heute überspringen
        </button>
      )}
    </div>
  );
}
