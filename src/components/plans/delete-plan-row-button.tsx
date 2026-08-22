"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePlanAction } from "@/lib/actions/plans";

export function DeletePlanRowButton({ planId, title }: { planId: string; title: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`Trainingsplan "${title}" wirklich löschen?`)) return;
    startTransition(async () => {
      const result = await deletePlanAction(planId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Plan gelöscht.");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Plan löschen"
    >
      löschen
    </button>
  );
}
