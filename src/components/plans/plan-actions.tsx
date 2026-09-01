"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePlanAction } from "@/lib/actions/plans";

export function PlanActions({ planId, redirectTo = "/trainer/plans" }: { planId: string; redirectTo?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Diesen Trainingsplan wirklich löschen?")) return;
    startTransition(async () => {
      const result = await deletePlanAction(planId);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.push(redirectTo);
      }
    });
  }

  return (
    <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isPending}>
      Löschen
    </button>
  );
}
