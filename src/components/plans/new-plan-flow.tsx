"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreatePlanForm } from "@/components/plans/create-plan-form";
import { deleteTemplateAction } from "@/lib/actions/plans";
import { Trash2Icon } from "lucide-react";

export type PlanTemplateSummary = {
  id: string;
  title: string;
  usage_note: string | null;
  itemCount: number;
  // Only populated (and shown as a badge) by the athlete's OwnPlanFlow,
  // which lists templates across both categories; NewPlanFlow's trainer
  // picker already pre-filters by category server-side so it's unused there.
  category_label?: string;
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
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();
  const isSportartspezifisch = defaultCategory === "Sportartspezifisch";
  const kickerClass = isSportartspezifisch ? "kicker-accent-2" : "kicker";

  function pick(id: string | null, title?: string) {
    setTemplateId(id);
    setTemplateTitle(title);
    setStep("rahmendaten");
  }

  function handleDeleteTemplate(e: React.MouseEvent, id: string, title: string) {
    e.stopPropagation();
    if (!confirm(`Vorlage "${title}" wirklich löschen?`)) return;
    startDeleteTransition(async () => {
      const result = await deleteTemplateAction(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Vorlage gelöscht.");
        router.refresh();
      }
    });
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
            <div key={t.id} className="exrow" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => pick(t.id, t.title)}
                style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit", font: "inherit" }}
              >
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
              <button
                type="button"
                className="btn btn-ghost"
                disabled={isDeleting}
                onClick={(e) => handleDeleteTemplate(e, t.id, t.title)}
                aria-label="Vorlage löschen"
              >
                <Trash2Icon />
              </button>
            </div>
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
