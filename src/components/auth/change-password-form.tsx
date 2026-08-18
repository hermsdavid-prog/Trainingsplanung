"use client";

import { useActionState } from "react";
import { changePasswordAction, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: ActionResult = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Neues Passwort</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="passwordConfirm">Neues Passwort bestätigen</Label>
        <PasswordInput
          id="passwordConfirm"
          name="passwordConfirm"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Speichern…" : "Passwort speichern"}
      </Button>
    </form>
  );
}
