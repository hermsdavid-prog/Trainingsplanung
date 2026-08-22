import { CreateOwnPlanForm } from "@/components/plans/create-own-plan-form";

export default function NewOwnPlanPage() {
  return (
    <div className="max-w-[520px]">
      <div className="kicker">Eigenes Workout</div>
      <h2 className="mt-2.5 text-[27px] leading-[1.08]">Training erstellen</h2>
      <p className="mt-2.5 text-sm leading-[1.55]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
        Lege die Rahmendaten fest — die Übungstabelle folgt im nächsten Schritt. Dein Trainer
        kann dieses Training einsehen.
      </p>
      <div className="mt-6">
        <CreateOwnPlanForm />
      </div>
    </div>
  );
}
