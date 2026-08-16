import { CreateOwnPlanForm } from "@/components/plans/create-own-plan-form";

export default function NewOwnPlanPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">Eigenes Training erstellen</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Lege die Rahmendaten fest — die Übungstabelle folgt im nächsten Schritt. Dein
        Trainer kann dieses Training einsehen.
      </p>
      <CreateOwnPlanForm />
    </div>
  );
}
