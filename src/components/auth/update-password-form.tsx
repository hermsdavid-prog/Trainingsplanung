"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePasswordAction } from "@/lib/actions/auth";

export function UpdatePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await updatePasswordAction(currentPassword, password, passwordConfirm);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Passwort geändert.");
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirm("");
    });
  }

  return (
    <div className="flex flex-col">
      <div className="field">
        <label htmlFor="currentPassword">Aktuelles Passwort</label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          className="input"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className="field mt-3.5">
        <label htmlFor="newPassword">Neues Passwort</label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="input"
          placeholder="mindestens acht Zeichen"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="field mt-3.5">
        <label htmlFor="newPasswordConfirm">Neues Passwort wiederholen</label>
        <input
          id="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="input"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block mt-5"
        disabled={isPending || !currentPassword || !password || !passwordConfirm}
        onClick={handleSubmit}
      >
        {isPending ? "Wird gespeichert…" : "Passwort ändern"}
      </button>
    </div>
  );
}
