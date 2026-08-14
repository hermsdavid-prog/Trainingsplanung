"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePlanAction, setPlanStatusAction } from "@/lib/actions/plans";
import { Button } from "@/components/ui/button";

export function PlanActions({
  planId,
  status,
}: {
  planId: string;
  status: "draft" | "published";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleStatus() {
    const next = status === "published" ? "draft" : "published";
    startTransition(async () => {
      const result = await setPlanStatusAction(planId, next);
      if (result.error) toast.error(result.error);
      else toast.success(next === "published" ? "Plan veröffentlicht." : "Plan zurückgezogen.");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Diesen Trainingsplan wirklich löschen?")) return;
    startTransition(async () => {
      const result = await deletePlanAction(planId);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.push("/trainer/plans");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={toggleStatus} disabled={isPending}>
        {status === "published" ? "Zurück in Entwurf" : "Veröffentlichen"}
      </Button>
      <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
        Löschen
      </Button>
    </div>
  );
}
