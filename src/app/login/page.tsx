import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{ background: "var(--dc-neutral-200)" }}
    >
      <div
        className="grid w-full max-w-[920px] grid-cols-1 lg:grid-cols-2"
        style={{ background: "var(--dc-bg)", boxShadow: "var(--dc-shadow-md)", minHeight: 520 }}
      >
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="kicker">Anmelden</div>
          <h2 className="mt-2.5 text-[28px] leading-[1.06] sm:text-[34px] sm:leading-[1.05]">
            Willkommen zurück
          </h2>
          <p className="mt-2.5 text-sm leading-[1.6]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
            Die Rolle steht am Konto — Athleten landen im Training, Trainer im Arbeitsplatz,
            Admins in der Nutzerverwaltung.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
        <div
          className="flex flex-col justify-center gap-[18px] p-6 sm:p-10"
          style={{ background: "var(--dc-surface)" }}
        >
          <div className="kicker-muted">Ohne Einladung kein Zugang</div>
          <p className="text-[16px] leading-[1.6]">
            Accounts legt ausschließlich der Admin an — mit Rolle, Name und E-Mail. Es gibt keine
            Selbstregistrierung.
          </p>
          <p className="text-[13px] leading-[1.5]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
            Beim ersten Login wird das vom Admin vergebene Einmal-Passwort durch ein persönliches
            Passwort ersetzt.
          </p>
        </div>
      </div>
    </div>
  );
}
