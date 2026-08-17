import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { CategoryBadge } from "@/components/plans/category-badge";
import { DeletePlanRowButton } from "@/components/plans/delete-plan-row-button";
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

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const [{ data: plans }, { data: profile }] = await Promise.all([
    supabase
      .from("training_plans")
      .select(
        "id, title, category_label, date, scope_type, created_by, groups(name), profiles!training_plans_athlete_id_fkey(full_name)"
      )
      .order("date", { ascending: false }),
    currentUser
      ? supabase.from("profiles").select("role").eq("id", currentUser.id).single()
      : Promise.resolve({ data: null }),
  ]);

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
            <TableHead>Typ</TableHead>
            <TableHead>Für</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(plans ?? []).map((plan) => {
            const canDelete =
              profile?.role === "admin" ||
              plan.created_by === currentUser?.id ||
              plan.scope_type === "group";
            return (
              <TableRow key={plan.id}>
                <TableCell>{plan.date}</TableCell>
                <TableCell>
                  <CategoryBadge label={plan.category_label} />
                </TableCell>
                <TableCell>
                  {plan.scope_type === "group"
                    ? (plan.groups?.name ?? "—")
                    : (plan.profiles?.full_name ?? "—")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/trainer/plans/${plan.id}/edit`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Bearbeiten
                    </Link>
                    {canDelete && (
                      <DeletePlanRowButton planId={plan.id} title={plan.title} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {(!plans || plans.length === 0) && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Noch keine Trainingspläne angelegt.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
