import { createClient } from "@/lib/supabase/server";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  trainer: "Trainer",
  athlete: "Athlet",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, must_change_password, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Nutzer</h1>
          <p className="text-sm text-muted-foreground">
            Accounts für Trainer und Athleten anlegen und verwalten.
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Rolle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(profiles ?? []).map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.full_name || "—"}</TableCell>
              <TableCell>{ROLE_LABELS[p.role] ?? p.role}</TableCell>
              <TableCell>
                {p.must_change_password ? (
                  <Badge variant="secondary">Passwort ausstehend</Badge>
                ) : (
                  <Badge variant="outline">Aktiv</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {p.id !== currentUser?.id && (
                  <DeleteUserDialog userId={p.id} fullName={p.full_name || "—"} />
                )}
              </TableCell>
            </TableRow>
          ))}
          {(!profiles || profiles.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Noch keine Nutzer angelegt.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
