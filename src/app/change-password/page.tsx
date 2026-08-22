import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default function ChangePasswordPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{ background: "var(--dc-neutral-200)" }}
    >
      <div
        className="w-full max-w-[520px] p-6 sm:p-10"
        style={{ background: "var(--dc-bg)", boxShadow: "var(--dc-shadow-md)" }}
      >
        <div className="kicker">Erstes Login</div>
        <h2 className="mt-2.5 text-[28px] leading-[1.06] sm:text-[30px] sm:leading-[1.05]">
          Passwort festlegen
        </h2>
        <p className="mt-2.5 text-sm leading-[1.6]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
          Das Einmal-Passwort gilt nur für diese Anmeldung.
        </p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
