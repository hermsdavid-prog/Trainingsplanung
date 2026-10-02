import { LoginForm } from "@/components/auth/login-form";

// This page has no dynamic API calls, so Next.js treats it as fully static
// and would otherwise send Cache-Control: s-maxage=31536000 (one year).
// Hostinger's CDN honors that literally and doesn't purge its edge cache on
// deploy, so an edge node that cached the page before a release keeps
// serving its old HTML — which references JS chunk files a newer build has
// since removed — until that edge's copy expires, i.e. up to a year. That's
// what caused the intermittent "This page couldn't load" on /login. Capping
// revalidation here forces the CDN to re-check with the origin often enough
// that a stale edge self-heals within a minute of any deploy.
export const revalidate = 60;

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{ background: "var(--dc-neutral-200)" }}
    >
      <div
        className="grid w-full max-w-[920px] grid-cols-1 overflow-hidden lg:grid-cols-2"
        style={{ background: "var(--dc-surface)", boxShadow: "var(--dc-shadow-md)", minHeight: 520 }}
      >
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="kicker">Anmelden</div>
          <h2 className="mt-2.5 text-[28px] leading-[1.06] sm:text-[34px] sm:leading-[1.05]">
            Willkommen zurück
          </h2>
          <p className="mt-2.5 text-sm leading-[1.6]" style={{ color: "var(--dc-muted)" }}>
            Die Rolle steht am Konto — Athleten landen im Training, Trainer im Arbeitsplatz,
            Admins in der Nutzerverwaltung.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
        <div
          className="flex flex-col justify-end gap-4 p-6 sm:p-10"
          style={{ background: "#004961", color: "#fff" }}
        >
          <div
            className="text-[30px] leading-[1.05] font-semibold sm:text-[38px]"
            style={{ fontFamily: "var(--dc-font-heading)" }}
          >
            Trainings&shy;planung
          </div>
          <p className="max-w-[34ch] text-[15px] leading-[1.6]" style={{ color: "color-mix(in srgb, #fff 85%, transparent)" }}>
            Pläne, Mesozyklen und Trainingsbereitschaft für Karate und Athletik — an einem Ort.
          </p>
          <div className="mt-2 border-t pt-4 text-[13px] leading-[1.55]" style={{ borderColor: "color-mix(in srgb, #fff 25%, transparent)", color: "color-mix(in srgb, #fff 78%, transparent)" }}>
            <strong className="font-semibold" style={{ color: "#fff" }}>Ohne Einladung kein Zugang.</strong> Accounts legt
            ausschließlich der Admin an. Beim ersten Login wird das Einmal-Passwort durch ein persönliches
            Passwort ersetzt.
          </div>
        </div>
      </div>
    </div>
  );
}
