"use client";

import { useState } from "react";
import { CreateOwnPlanForm } from "@/components/plans/create-own-plan-form";
import { CategoryBadge } from "@/components/plans/category-badge";
import type { PlanTemplateSummary } from "@/components/plans/new-plan-flow";

// Athlete equivalent of NewPlanFlow's "Vorlage wählen" → Rahmendaten flow.
// Templates here already come pre-scoped by the plan_templates_select RLS
// policy (group_id in the athlete's own groups, or trainer/admin-authored
// with no group restriction doesn't apply to athletes) — the server page
// does a plain select and passes down only what this athlete may see, no
// client-side filtering needed. Unlike the trainer flow (which fixes the
// category before showing templates), an athlete's own-plan category isn't
// chosen yet at this point, so templates from both categories are listed
// together with a badge, and picking one pre-selects that category in step 2
// (still changeable, matching the athlete form's existing flexibility).
export function OwnPlanFlow({ templates }: { templates: PlanTemplateSummary[] }) {
  const [step, setStep] = useState<"vorlage" | "rahmendaten">("vorlage");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState<string | undefined>(undefined);
  const [templateCategory, setTemplateCategory] = useState<string | undefined>(undefined);

  function pick(id: string | null, title?: string, category?: string) {
    setTemplateId(id);
    setTemplateTitle(title);
    setTemplateCategory(category);
    setStep("rahmendaten");
  }

  if (step === "vorlage") {
    return (
      <div>
        <div className="kicker">Schritt 1 von 2</div>
        <h2 className="mt-2.5 text-[27px] leading-[1.08]">Vorlage wählen</h2>
        <p className="mt-2.5 text-sm leading-[1.55]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
          Optional — du kannst auch leer starten und die Übungstabelle im nächsten Schritt selbst füllen.
        </p>
        <div className="mt-6">
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
            <button key={t.id} type="button" className="exrow" onClick={() => pick(t.id, t.title, t.category_label)}>
              <div className="flex items-center justify-between gap-5">
                <span className="text-[19px]">{t.title}</span>
                <div className="flex flex-none items-center gap-2">
                  {t.category_label && <CategoryBadge label={t.category_label} />}
                  <span className="text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}>
                    {t.itemCount} {t.itemCount === 1 ? "Übung" : "Übungen"}
                  </span>
                </div>
              </div>
              {t.usage_note && (
                <div className="mt-0.5 text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                  {t.usage_note}
                </div>
              )}
            </button>
          ))}
          {templates.length === 0 && (
            <p className="mt-2 text-sm text-muted">
              Noch keine Vorlage für deine Gruppen verfügbar.
            </p>
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
      <div className="kicker mt-3.5">Schritt 2 von 2</div>
      <h2 className="mt-2.5 text-[27px] leading-[1.08]">Rahmendaten</h2>
      <p className="mt-2.5 text-sm leading-[1.55]" style={{ color: "color-mix(in srgb, var(--dc-text) 62%, transparent)" }}>
        Lege die Rahmendaten fest — die Übungstabelle folgt im nächsten Schritt. Dein Trainer
        kann dieses Training einsehen.
      </p>
      <div className="mt-6">
        <CreateOwnPlanForm templateId={templateId} defaultTitle={templateTitle} defaultCategory={templateCategory} />
      </div>
    </div>
  );
}
