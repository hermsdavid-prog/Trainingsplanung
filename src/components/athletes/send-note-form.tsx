"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendAthleteNoteAction } from "@/lib/actions/athlete-notes";

export function SendNoteForm({ athleteId }: { athleteId: string }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSend() {
    if (!message.trim()) return;
    startTransition(async () => {
      const result = await sendAthleteNoteAction(athleteId, message);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Hinweis gesendet.");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="field flex-1" style={{ margin: 0 }}>
        <textarea
          className="input"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="z. B. Deine Ruhe-HF war heute erhöht — heute lieber vorsichtig trainieren."
        />
      </div>
      <button type="button" className="btn btn-primary" disabled={isPending || !message.trim()} onClick={handleSend}>
        {isPending ? "Wird gesendet…" : "Senden"}
      </button>
    </div>
  );
}
