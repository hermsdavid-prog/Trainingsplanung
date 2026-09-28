import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { logoutAction } from "@/lib/actions/auth";

export function AccountSettings() {
  return (
    <div>
      <div className="kicker">Einstellungen</div>
      <h2 className="mt-1.5 text-[27px] leading-[1.08]">Konto</h2>
      <div className="kicker-muted mt-7">Passwort ändern</div>
      <div className="mt-3 max-w-[420px]">
        <UpdatePasswordForm />
      </div>

      <div className="mt-10 max-w-[420px] border-t pt-6" style={{ borderColor: "var(--dc-divider)" }}>
        <div className="kicker-muted">Sitzung</div>
        <form action={logoutAction} className="mt-3">
          <button type="submit" className="btn btn-secondary btn-block">
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
