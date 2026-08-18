"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: ActionResult = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Passwort</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Anmelden…" : "Anmelden"}
      </Button>
    </form>
  );
}
