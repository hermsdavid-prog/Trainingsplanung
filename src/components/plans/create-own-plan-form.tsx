"use client";

import { useActionState } from "react";
import { createOwnPlanAction, type ActionResult } from "@/lib/actions/plans";
import { PLAN_TYPES } from "@/lib/plan-type";

const initialState: ActionResult = {};

export function CreateOwnPlanForm({
  templateId,
  defaultTitle,
  defaultCategory,
}: {
  templateId?: string | null;
  defaultTitle?: string;
  defaultCategory?: string;
} = {}) {
  const [state, formAction, isPending] = useActionState(createOwnPlanAction, initialState);

  return (
    <form action={formAction} className="flex flex-col">
      {templateId && <input type="hidden" name="template_id" value={templateId} />}

      <div className="field">
        <label htmlFor="title">Titel</label>
        <input
          id="title"
          name="title"
          required
          className="input"
          defaultValue={defaultTitle}
          placeholder="z. B. Eigenes Workout"
        />
      </div>

      <div className="field mt-3.5">
        <label htmlFor="category_label">Typ</label>
        <select
          id="category_label"
          name="category_label"
          defaultValue={defaultCategory ?? PLAN_TYPES[0]}
          required
          className="input"
        >
          {PLAN_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">
          Bei &bdquo;Athletik&rdquo; gliedert sich die Übungstabelle in die Bereiche Kraft und
          Cardio; Kraftübungen stehen aus einer Bibliothek mit Vorschlägen zur Verfügung, und die
          Ergebnisse können als Fortschrittskurve verfolgt werden.
        </p>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-3.5">
        <div className="field" style={{ flex: "1 1 170px" }}>
          <label htmlFor="date">Datum</label>
          <input id="date" name="date" type="date" required className="input" />
        </div>
        <div className="field" style={{ flex: "1 1 110px" }}>
          <label htmlFor="time">Uhrzeit</label>
          <input id="time" name="time" className="input" placeholder="18:00" />
        </div>
      </div>

      {state.error && (
        <div className="mt-3 text-[13px]" style={{ color: "var(--dc-accent-2-700)" }}>
          {state.error}
        </div>
      )}

      <button type="submit" disabled={isPending} className="btn btn-primary mt-5">
        {isPending ? "Wird angelegt…" : "Weiter zur Übungstabelle"}
      </button>
    </form>
  );
}
