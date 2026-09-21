"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMesocycleGoalAction } from "@/lib/actions/mesocycle-goals";

export function AddGoalForm({
  athleteId,
  mesocycles,
}: {
  athleteId: string;
  mesocycles: { id: string; title: string }[];
}) {
  const [mesocycleId, setMesocycleId] = useState(mesocycles[0]?.id ?? "");
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    if (!text.trim() || !mesocycleId) return;
    startTransition(async () => {
      const result = await createMesocycleGoalAction({ mesocycleId, athleteId, text });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ziel hinzugefügt.");
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="field w-[180px]" style={{ margin: 0 }}>
        <label htmlFor="goal-mesocycle">Mesozyklus</label>
        <select id="goal-mesocycle" className="input" value={mesocycleId} onChange={(e) => setMesocycleId(e.target.value)}>
          {mesocycles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>
      <div className="field flex-1" style={{ margin: 0 }}>
        <label htmlFor="goal-text">Ziel</label>
        <input
          id="goal-text"
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="z. B. Beweglichkeit Hüfte verbessern"
        />
      </div>
      <button type="button" className="btn btn-primary" disabled={isPending || !text.trim()} onClick={handleAdd}>
        {isPending ? "Wird gespeichert…" : "Hinzufügen"}
      </button>
    </div>
  );
}
