"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmEventAction, deleteEventAction } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";

export function EventActions({
  eventId,
  status,
}: {
  eventId: string;
  status?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await confirmEventAction(eventId);
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Diesen Termin wirklich löschen?")) return;
    startTransition(async () => {
      const result = await deleteEventAction(eventId);
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 gap-1">
      {status === "proposed" && (
        <Button size="sm" variant="outline" onClick={handleConfirm} disabled={isPending}>
          Bestätigen
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isPending}>
        Löschen
      </Button>
    </div>
  );
}
