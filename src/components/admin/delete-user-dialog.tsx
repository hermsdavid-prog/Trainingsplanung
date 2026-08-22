"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteUserAction } from "@/lib/actions/admin-users";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setConfirmText("");
      setError(undefined);
    }
  }

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button type="button" className="btn btn-ghost" onClick={() => handleOpenChange(true)}>
        löschen
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[480px]">
          <div className="kicker-accent-2">Account endgültig löschen</div>
          <p className="mt-2 text-sm leading-[1.6]">
            Diese Aktion kann nicht rückgängig gemacht werden. Individuelle Trainingspläne,
            Gesundheitsdaten und Feedback von <strong>{fullName}</strong> werden unwiderruflich
            gelöscht. Gruppenpläne und Gruppen, die diese Person erstellt hat, bleiben erhalten.
          </p>

          <div className="field mt-4">
            <label htmlFor="confirm-name">
              Gib zur Bestätigung „{fullName}“ ein
            </label>
            <input
              id="confirm-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              className="input"
            />
          </div>

          {error && (
            <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
              {error}
            </div>
          )}

          <div className="mt-[18px] flex gap-2">
            <button
              type="button"
              className="btn"
              style={{ background: "var(--dc-accent-2-600)", color: "var(--dc-bg)" }}
              onClick={handleDelete}
              disabled={!canDelete || isPending}
            >
              {isPending ? "Wird gelöscht…" : "Account endgültig löschen"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
