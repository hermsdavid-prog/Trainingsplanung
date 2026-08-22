"use client";

import { useState, useTransition } from "react";
import { submitConsentAction } from "@/lib/actions/consent";
import { PrivacyPolicyDialog } from "@/components/shell/privacy-policy-dialog";

export function ConsentForm({
  isAthlete,
  initialTermsAccepted = false,
  initialHealthConsent = false,
}: {
  isAthlete: boolean;
  initialTermsAccepted?: boolean;
  initialHealthConsent?: boolean;
}) {
  const [termsAccepted, setTermsAccepted] = useState(initialTermsAccepted);
  const [healthConsent, setHealthConsent] = useState(initialHealthConsent);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(health: boolean) {
    if (!termsAccepted) {
      setError("Der Datenschutzerklärung musst du zustimmen.");
      return;
    }
    if (isAthlete && health && !healthConsent) {
      setError("Für Gesundheitsdaten brauchen wir deine ausdrückliche Einwilligung — oder du überspringst sie.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await submitConsentAction(termsAccepted, isAthlete ? health : false);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setTermsAccepted((v) => !v);
          setError("");
        }}
        className="mt-6 flex w-full items-start gap-3 rounded-sm border p-3.5 text-left"
        style={{ borderColor: "var(--dc-divider)", background: "transparent", color: "var(--dc-text)" }}
      >
        <span
          className="flex size-[22px] flex-none items-center justify-center rounded-sm border text-sm leading-5"
          style={{
            borderColor: "var(--dc-accent)",
            background: termsAccepted ? "var(--dc-accent)" : "transparent",
            color: "var(--dc-bg)",
          }}
        >
          {termsAccepted ? "✓" : ""}
        </span>
        <span>
          <span className="block text-[15px]" style={{ color: "var(--dc-text)" }}>
            Datenschutzerklärung gelesen
          </span>
          <span
            className="mt-1 block text-xs leading-[1.5]"
            style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}
          >
            Trainingsdaten, Rollen, Gruppen — Art. 6 Abs. 1 lit. b und f DSGVO.
          </span>
        </span>
      </button>

      {isAthlete && (
        <button
          type="button"
          onClick={() => {
            setHealthConsent((v) => !v);
            setError("");
          }}
          className="mt-3 flex w-full items-start gap-3 rounded-sm border p-3.5 text-left"
          style={{ borderColor: "var(--dc-divider)", background: "transparent", color: "var(--dc-text)" }}
        >
          <span
            className="flex size-[22px] flex-none items-center justify-center rounded-sm border text-sm leading-5"
            style={{
              borderColor: "var(--dc-accent)",
              background: healthConsent ? "var(--dc-accent)" : "transparent",
              color: "var(--dc-bg)",
            }}
          >
            {healthConsent ? "✓" : ""}
          </span>
          <span>
            <span className="block text-[15px]" style={{ color: "var(--dc-text)" }}>
              Gesundheitsdaten freigeben
            </span>
            <span
              className="mt-1 block text-xs leading-[1.5]"
              style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}
            >
              HRV, Ruhe-Herzfrequenz und Wohlbefinden für die Trainer deiner Gruppe — Art. 9 Abs. 2
              lit. a DSGVO. Freiwillig, jederzeit widerrufbar.
            </span>
          </span>
        </button>
      )}

      {error && (
        <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={() => submit(true)}
        className="btn btn-primary btn-block mt-5"
      >
        {isPending ? "Wird gespeichert…" : "Zustimmen und starten"}
      </button>
      {isAthlete && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit(false)}
          className="btn btn-ghost btn-block"
        >
          Ohne Gesundheitsdaten starten
        </button>
      )}
      <PrivacyPolicyDialog trigger="Datenschutzerklärung lesen" triggerClassName="btn btn-ghost btn-block" />
    </div>
  );
}
