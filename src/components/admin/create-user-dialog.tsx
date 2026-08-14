"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUserAction } from "@/lib/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setError(undefined);
      setCreated(null);
    }
  }

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await createUserAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else if (result.email && result.tempPassword) {
        setCreated({ email: result.email, tempPassword: result.tempPassword });
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button>Neuen Nutzer anlegen</Button>} />
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Account angelegt</DialogTitle>
              <DialogDescription>
                Dieses Einmal-Passwort wird nur jetzt angezeigt — bitte an die Person
                weitergeben. Beim ersten Login muss es geändert werden.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 rounded-md border bg-muted/50 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">E-Mail: </span>
                <span className="font-mono">{created.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Passwort: </span>
                <span className="font-mono">{created.tempPassword}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Fertig</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Neuen Nutzer anlegen</DialogTitle>
              <DialogDescription>
                Es wird automatisch ein Einmal-Passwort generiert.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Rolle</Label>
              <Select
                name="role"
                defaultValue="athlete"
                required
                items={{ admin: "Admin", trainer: "Trainer", athlete: "Athlet" }}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="athlete">Athlet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Wird angelegt…" : "Account anlegen"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
