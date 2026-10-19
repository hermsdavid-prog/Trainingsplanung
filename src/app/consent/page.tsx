import Link from "next/link";
import { getMyConsentAction } from "@/lib/actions/consent";
import { ConsentForm } from "@/components/auth/consent-form";

export default async function ConsentPage() {
  const consent = await getMyConsentAction();
  const isAthlete = consent.role === "athlete";
  // Reached again from Konto/Einstellungen to change an existing consent.
  const editing = consent.termsAccepted;

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{ background: "var(--dc-neutral-200)" }}
    >
      <div
        className="w-full max-w-[560px] p-6 sm:p-10"
        style={{ background: "var(--dc-bg)", boxShadow: "var(--dc-shadow-md)" }}
      >
        {editing && (
          <Link href={isAthlete ? "/athlete/settings" : "/trainer/settings"} className="btn btn-ghost mb-3 -ml-2">
            ← Zurück
          </Link>
        )}
        <div className="kicker">{editing ? "Datenschutz" : "Bevor es losgeht"}</div>
        <h2 className="mt-2.5 text-[28px] leading-[1.06] sm:text-[30px] sm:leading-[1.05]">
          {editing ? "Einwilligung ändern" : "Datenschutz"}
        </h2>
        <p
          className="mt-2.5 text-sm leading-[1.6]"
          style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}
        >
          Wir speichern nur, was für Planung und Dokumentation nötig ist. Gesundheitswerte sind
          besonders geschützt — sie brauchen deine ausdrückliche Einwilligung und du kannst sie
          jederzeit widerrufen.
        </p>
        <ConsentForm
          isAthlete={isAthlete}
          initialTermsAccepted={consent.termsAccepted}
          initialHealthConsent={consent.healthConsent}
          editing={editing}
        />
      </div>
    </div>
  );
}
