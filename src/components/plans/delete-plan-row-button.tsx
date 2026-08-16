"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { deletePlanAction } from "@/lib/actions/plans";
import { Button } from "@/components/ui/button";

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
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Plan löschen"
    >
      <Trash2Icon />
    </Button>
  );
}
