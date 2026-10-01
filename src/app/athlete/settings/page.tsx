import Link from "next/link";
import { AccountSettings } from "@/components/auth/account-settings";

export default function AthleteSettingsPage() {
  return (
    <>
      <AccountSettings />
      <div className="mt-6 max-w-[560px] p-4" style={{ background: "var(--dc-surface)" }}>
        <div className="kicker">Datenschutz</div>
        <p className="mt-1.5 text-sm leading-[1.5]">
          Einwilligung für Gesundheitswerte (Check-in, HRV, Ruhepuls) erteilen oder widerrufen.
        </p>
        <Link href="/consent" className="btn btn-secondary mt-3">
          Einwilligung ändern
        </Link>
      </div>
    </>
  );
}
