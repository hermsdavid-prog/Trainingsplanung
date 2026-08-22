"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUserAction } from "@/lib/actions/admin-users";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
} from "@/components/ui/dialog";

const ROLES = [
  { key: "trainer", label: "Trainer" },
  { key: "athlete", label: "Athlet" },
  { key: "admin", label: "Admin" },
] as const;

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<(typeof ROLES)[number]["key"]>("athlete");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setError(undefined);
      setCreated(null);
      setName("");
      setEmail("");
      setRole("athlete");
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
      <button type="button" className="btn btn-primary" onClick={() => handleOpenChange(true)}>
        Neuen Nutzer anlegen
      </button>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent showCloseButton={false} className="dc-dialog max-w-[520px]">
          {created ? (
            <div>
              <div className="kicker">Account angelegt</div>
              <p className="mt-2 text-sm leading-[1.6]">
                Dieses Einmal-Passwort wird nur jetzt angezeigt — bitte an die Person
                weitergeben. Beim ersten Login muss es geändert werden.
              </p>
              <div className="mt-4 p-4" style={{ background: "var(--dc-bg)" }}>
                <div className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                  E-Mail
                </div>
                <div className="mt-1 font-mono text-sm">{created.email}</div>
                <div className="mt-3 text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                  Passwort
                </div>
                <div className="mt-1 font-mono text-lg">{created.tempPassword}</div>
              </div>
              <button type="button" className="btn btn-primary mt-[18px]" onClick={() => setOpen(false)}>
                Fertig
              </button>
            </div>
          ) : (
            <form action={handleSubmit} className="flex flex-col">
              <div className="kicker-muted">Neuen Nutzer anlegen</div>
              <p className="mt-2 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
                Es wird automatisch ein Einmal-Passwort generiert.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className="chip"
                    onClick={() => setRole(r.key)}
                    style={{
                      background: role === r.key ? "var(--dc-accent)" : "transparent",
                      color: role === r.key ? "var(--dc-bg)" : "var(--dc-text)",
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="role" value={role} />
              <div className="field mt-4">
                <label htmlFor="full_name">Name</label>
                <input
                  id="full_name"
                  name="full_name"
                  required
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vor- und Nachname"
                />
              </div>
              <div className="field mt-3.5">
                <label htmlFor="email">E-Mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@verein.de"
                />
              </div>
              {error && (
                <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
                  {error}
                </div>
              )}
              <div className="mt-[18px] flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Wird angelegt…" : "Account anlegen"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Abbrechen
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
