"use client";

import { useState } from "react";
import { CreatePlanForm } from "@/components/plans/create-plan-form";

export type PlanTemplateSummary = {
  id: string;
  title: string;
  usage_note: string | null;
  itemCount: number;
};

// Mirrors the design's two-step "Vorlage wählen" → Rahmendaten flow
// (tVorlagen / tKaVorlagen → the plan-creation form). Picking a template
// carries its id through to createPlanAction, which prefills the new plan's
// exercise table from plan_templates.items; "Ohne Vorlage" starts blank.
export function NewPlanFlow({
  templates,
  groups,
  athletes,
  defaultCategory,
  defaultDate,
}: {
  templates: PlanTemplateSummary[];
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
  defaultCategory: string;
  defaultDate?: string;
}) {
  const [step, setStep] = useState<"vorlage" | "rahmendaten">("vorlage");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState<string | undefined>(undefined);
  const isSportartspezifisch = defaultCategory === "Sportartspezifisch";
  const kickerClass = isSportartspezifisch ? "kicker-accent-2" : "kicker";

  function pick(id: string | null, title?: string) {
    setTemplateId(id);
    setTemplateTitle(title);
    setStep("rahmendaten");
  }

  if (step === "vorlage") {
    return (
      <div>
        <div className={kickerClass}>Schritt 1 von 2</div>
        <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Vorlage wählen</h2>
        <div className="mt-6 max-w-[700px]">
          <button type="button" className="exrow" onClick={() => pick(null)}>
            <div className="flex items-baseline justify-between gap-5">
              <span className="text-[19px]">Ohne Vorlage</span>
              <span className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}>
                leer starten
              </span>
            </div>
            <div className="mt-0.5 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
              Übungstabelle bleibt zunächst leer, du füllst sie im nächsten Schritt selbst.
            </div>
          </button>
          {templates.map((t) => (
            <button key={t.id} type="button" className="exrow" onClick={() => pick(t.id, t.title)}>
              <div className="flex items-baseline justify-between gap-5">
                <span className="text-[19px]">{t.title}</span>
                <span className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}>
                  {t.itemCount} {t.itemCount === 1 ? "Übung" : "Übungen"}
                </span>
              </div>
              {t.usage_note && (
                <div className="mt-0.5 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                  {t.usage_note}
                </div>
              )}
            </button>
          ))}
          {templates.length === 0 && (
            <p className="mt-2 text-sm text-muted">Noch keine Vorlage gespeichert.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="btn btn-ghost" onClick={() => setStep("vorlage")}>
        ← Zurück
      </button>
      <div className={`${kickerClass} mt-3.5`}>Schritt 2 von 2</div>
      <h2 className="mt-2.5 text-[28px] leading-[1.06] lg:text-[34px] lg:leading-[1.05]">Rahmendaten</h2>
      <p className="mt-2.5 text-sm" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
        Lege die Rahmendaten fest — die Übungstabelle folgt im nächsten Schritt.
      </p>
      <div className="mt-6 max-w-[520px]">
        <CreatePlanForm
          groups={groups}
          athletes={athletes}
          defaultCategory={defaultCategory}
          defaultDate={defaultDate}
          templateId={templateId}
          defaultTitle={templateTitle}
        />
      </div>
    </div>
  );
}
