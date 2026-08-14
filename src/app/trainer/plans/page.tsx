import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TrainerPlansPage() {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("training_plans")
    .select(
      "id, title, category_label, status, date, scope_type, groups(name), profiles!training_plans_athlete_id_fkey(full_name)"
    )
    .order("date", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trainingspläne</h1>
          <p className="text-sm text-muted-foreground">
            Gruppen- und Einzelpläne erstellen und verwalten.
          </p>
        </div>
        <Link href="/trainer/plans/new" className={buttonVariants()}>
          Neuer Plan
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Titel</TableHead>
            <TableHead>Oberkategorie</TableHead>
            <TableHead>Für</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(plans ?? []).map((plan) => (
            <TableRow key={plan.id}>
              <TableCell>{plan.date}</TableCell>
              <TableCell>{plan.title}</TableCell>
              <TableCell>{plan.category_label || "—"}</TableCell>
              <TableCell>
                {plan.scope_type === "group"
                  ? (plan.groups?.name ?? "—")
                  : (plan.profiles?.full_name ?? "—")}
              </TableCell>
              <TableCell>
                {plan.status === "published" ? (
                  <Badge variant="outline">Veröffentlicht</Badge>
                ) : (
                  <Badge variant="secondary">Entwurf</Badge>
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/trainer/plans/${plan.id}/edit`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Bearbeiten
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {(!plans || plans.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Noch keine Trainingspläne angelegt.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
