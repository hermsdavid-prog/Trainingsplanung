"use client";

import { useActionState } from "react";
import { changePasswordAction, type ActionResult } from "@/lib/actions/auth";

const initialState: ActionResult = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col">
      <div className="field">
        <label htmlFor="password">Neues Passwort</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input"
          placeholder="mindestens acht Zeichen"
        />
      </div>
      <div className="field mt-3.5">
        <label htmlFor="passwordConfirm">Wiederholen</label>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input"
        />
      </div>
      {state.error && (
        <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
          {state.error}
        </div>
      )}
      <button type="submit" disabled={isPending} className="btn btn-primary btn-block mt-5">
        {isPending ? "Speichern…" : "Speichern und weiter"}
      </button>
    </form>
  );
}
