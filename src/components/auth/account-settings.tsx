import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export function AccountSettings() {
  return (
    <div>
      <div className="kicker">Konto</div>
      <h2 className="mt-1.5 text-[27px] leading-[1.08]">Passwort ändern</h2>
      <div className="mt-6 max-w-[420px]">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
