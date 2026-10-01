"use client";

import { useEffect } from "react";
import Link from "next/link";

// Shown instead of Next's bare error page when a page or a server action
// throws — e.g. "Nicht angemeldet." after the session ran out while saving,
// or "Keine Berechtigung" for a plan someone else manages.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error.message || "";
  const sessionGone = /nicht angemeldet/i.test(message);
  const forbidden = /keine berechtigung/i.test(message);

  return (
    <div className="mx-auto max-w-[480px] p-6">
      <div className="kicker">Hoppla</div>
      <h2 className="mt-2 text-[24px] leading-[1.15]">
        {sessionGone
          ? "Deine Anmeldung ist abgelaufen."
          : forbidden
            ? "Dafür fehlt dir die Berechtigung."
            : "Da ist etwas schiefgelaufen."}
      </h2>
      <p className="mt-2 text-sm leading-[1.55]" style={{ color: "var(--dc-muted)" }}>
        {sessionGone
          ? "Bitte melde dich neu an. Bereits gespeicherte Eingaben bleiben erhalten."
          : "Versuch es noch einmal. Hilft das nicht, ist vielleicht deine Anmeldung abgelaufen."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {/* In production Next replaces server error messages with a generic
            text, so "Neu anmelden" is always offered as a way out. */}
        {sessionGone ? null : (
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
            Erneut versuchen
          </button>
        )}
        <Link href="/login" className={sessionGone ? "btn btn-primary" : "btn btn-secondary"}>
          Neu anmelden
        </Link>
        <Link href="/" className="btn btn-ghost">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
