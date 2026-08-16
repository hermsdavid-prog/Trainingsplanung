"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteUserAction } from "@/lib/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteUserDialog({
  userId,
  fullName,
}: {
  userId: string;
  fullName: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canDelete = confirmText.trim() === fullName.trim();

  function handleDelete() {
    if (!canDelete) return;
    startTransition(async () => {
      const result = await deleteUserAction(userId);
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(`${fullName} wurde gelöscht.`);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setConfirmText("");
          setError(undefined);
        }
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="sm">Löschen</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account endgültig löschen</DialogTitle>
          <DialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden. Individuelle Trainingspläne,
            Gesundheitsdaten und Feedback von <strong>{fullName}</strong> werden unwiderruflich
            gelöscht. Gruppenpläne und Gruppen, die diese Person erstellt hat, bleiben erhalten.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-name">
            Gib zur Bestätigung <strong>{fullName}</strong> ein
          </Label>
          <Input
            id="confirm-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isPending}
          >
            {isPending ? "Wird gelöscht…" : "Account endgültig löschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
