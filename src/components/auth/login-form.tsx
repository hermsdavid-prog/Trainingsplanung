"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionResult } from "@/lib/actions/auth";
import { PrivacyPolicyDialog } from "@/components/shell/privacy-policy-dialog";
import { ImprintDialog } from "@/components/shell/imprint-dialog";

const initialState: LoginActionResult = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col">
      <div className="field">
        <label htmlFor="email">E-Mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="input"
          placeholder="name@verein.de"
          defaultValue={state.email ?? ""}
        />
      </div>
      <div className="field mt-3.5">
        <label htmlFor="password">Passwort</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
      </div>
      {state.error && (
        <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
          {state.error}
        </div>
      )}
      <button type="submit" disabled={isPending} className="btn btn-primary mt-5">
        {isPending ? "Anmelden…" : "Anmelden"}
      </button>
      <div className="mt-[18px] flex gap-4 text-[13px]">
        <PrivacyPolicyDialog trigger="Datenschutzerklärung" />
        <ImprintDialog trigger="Impressum" />
      </div>
    </form>
  );
}
