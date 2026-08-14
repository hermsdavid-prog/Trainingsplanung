"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVerticalIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reschedulePlanAction, duplicatePlanToDateAction } from "@/lib/actions/plans";
import { rescheduleEventAction, duplicateEventToDateAction } from "@/lib/actions/events";

export function MoveCopyMenu({
  itemId,
  kind,
  currentDate,
}: {
  itemId: string;
  kind: "plan" | "event";
  currentDate: string;
}) {
  const [mode, setMode] = useState<"move" | "copy" | null>(null);
  const [targetDate, setTargetDate] = useState(currentDate);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function openDialog(nextMode: "move" | "copy") {
    setTargetDate(currentDate);
    setMode(nextMode);
  }

  function handleConfirm() {
    if (!mode || !targetDate) return;
    startTransition(async () => {
      const result =
        mode === "move"
          ? kind === "plan"
            ? await reschedulePlanAction(itemId, targetDate)
            : await rescheduleEventAction(itemId, targetDate)
          : kind === "plan"
            ? await duplicatePlanToDateAction(itemId, targetDate)
            : await duplicateEventToDateAction(itemId, targetDate);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(mode === "move" ? "Verschoben." : "Kopiert.");
        setMode(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => e.stopPropagation()}
              aria-label="Optionen"
            >
              <MoreVerticalIcon className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => openDialog("move")}>Verschieben</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDialog("copy")}>Kopieren</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {mode === "move" ? "Auf anderen Tag verschieben" : "Auf anderen Tag kopieren"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="move-copy-date">Zieldatum</Label>
            <Input
              id="move-copy-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Wird gespeichert…" : mode === "move" ? "Verschieben" : "Kopieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
