import { createClient } from "@/lib/supabase/server";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog";
import { RetentionField } from "@/components/admin/retention-field";
import { PrivacyPolicyDialog } from "@/components/shell/privacy-policy-dialog";
import { formatDateShort, utcISOToAppDateString } from "@/lib/date";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  trainer: "Trainer",
  athlete: "Athlet",
};

const DEFAULT_RETENTION = "90 Tage nach Austritt";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const [{ data: profiles }, { data: consents }, { data: retentionSetting }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role, must_change_password, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("athlete_consents").select("athlete_id, health_consent, consented_at"),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "health_data_retention")
      .maybeSingle(),
  ]);

  const mustChangeCount = (profiles ?? []).filter((p) => p.must_change_password).length;

  const consentByPersonId = new Map((consents ?? []).map((c) => [c.athlete_id, c]));
  const consentRows = (profiles ?? [])
    .filter((p) => p.role !== "admin")
    .map((p) => {
      const c = consentByPersonId.get(p.id);
      const isAthlete = p.role === "athlete";
      const state = !isAthlete
        ? { label: "Nicht nötig", tagClass: "tag-outline" }
        : c?.health_consent
          ? { label: "Erteilt", tagClass: "tag-neutral" }
          : c
            ? { label: "Abgelehnt", tagClass: "tag-accent-2" }
            : { label: "Offen", tagClass: "tag-accent" };
      return {
        id: p.id,
        name: p.full_name || "—",
        role: ROLE_LABELS[p.role] ?? p.role,
        state,
        date: c?.consented_at ? formatDateShort(utcISOToAppDateString(c.consented_at)) : "—",
      };
    });

  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="text-[34px] leading-[1.05]">Nutzer</h2>
          <p className="mt-2.5 text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
            {(profiles ?? []).length} Accounts · {mustChangeCount} warten auf das erste Login
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <table className="table mt-7">
        <thead>
          <tr>
            <th>Name</th>
            <th>Rolle</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(profiles ?? []).map((p) => (
            <tr key={p.id}>
              <td className="text-[15px]">{p.full_name || "—"}</td>
              <td className="text-sm">{ROLE_LABELS[p.role] ?? p.role}</td>
              <td>
                <span className={`tag ${p.must_change_password ? "tag-accent" : "tag-outline"}`}>
                  {p.must_change_password ? "Passwort ausstehend" : "Aktiv"}
                </span>
              </td>
              <td>
                {p.id !== currentUser?.id && (
                  <DeleteUserDialog userId={p.id} fullName={p.full_name || "—"} />
                )}
              </td>
            </tr>
          ))}
          {(!profiles || profiles.length === 0) && (
            <tr>
              <td colSpan={4} className="text-center" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                Noch keine Nutzer angelegt.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-9 max-w-[720px]">
        <div className="kicker">Datenschutz</div>
        <p className="mt-2.5 text-sm leading-[1.6]" style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>
          Gesundheitsdaten liegen nur mit Einwilligung der Athleten vor. Hosting und Datenbank in der EU, Vertrag nach Art. 28 DSGVO.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-5">
          <RetentionField initialValue={retentionSetting?.value ?? DEFAULT_RETENTION} />
          <PrivacyPolicyDialog trigger="Datenschutzerklärung ansehen" />
        </div>

        <table className="table mt-5">
          <thead>
            <tr>
              <th>Person</th>
              <th>Rolle</th>
              <th>Einwilligung Gesundheit</th>
              <th>Seit</th>
            </tr>
          </thead>
          <tbody>
            {consentRows.map((row) => (
              <tr key={row.id}>
                <td className="text-[15px]">{row.name}</td>
                <td className="text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" }}>
                  {row.role}
                </td>
                <td>
                  <span className={`tag ${row.state.tagClass}`}>{row.state.label}</span>
                </td>
                <td className="text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                  {row.date}
                </td>
              </tr>
            ))}
            {consentRows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
                  Noch keine Trainer oder Athleten angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
