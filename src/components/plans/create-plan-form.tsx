"use client";

import { useActionState, useState } from "react";
import { createPlanAction, type ActionResult } from "@/lib/actions/plans";

const initialState: ActionResult = {};

export function CreatePlanForm({
  groups,
  athletes,
  defaultCategory,
  defaultDate,
  templateId,
  defaultTitle,
}: {
  groups: { id: string; name: string }[];
  athletes: { id: string; full_name: string }[];
  defaultCategory?: string;
  defaultDate?: string;
  templateId?: string | null;
  defaultTitle?: string;
}) {
  const [state, formAction, isPending] = useActionState(createPlanAction, initialState);
  const [scopeType, setScopeType] = useState<"group" | "athlete">("group");
  const [repeats, setRepeats] = useState(false);
  const isSportartspezifisch = defaultCategory === "Sportartspezifisch";

  return (
    <form action={formAction} className="flex flex-col">
      {templateId && <input type="hidden" name="template_id" value={templateId} />}
      {defaultCategory && <input type="hidden" name="category_label" value={defaultCategory} />}

      <div className="field">
        <label htmlFor="title">Titel</label>
        <input
          id="title"
          name="title"
          defaultValue={defaultTitle}
          required
          className="input"
          style={{
            fontFamily: "var(--dc-font-heading)",
            fontWeight: 600,
            fontSize: 22,
          }}
          placeholder={isSportartspezifisch ? "z. B. Karate — Kumite-Vorbereitung" : "z. B. Athletik — Unterkörper"}
        />
      </div>

      <div className="mt-3.5 flex flex-wrap gap-3.5">
        <div className="field" style={{ flex: "1 1 170px" }}>
          <label htmlFor="date">Datum</label>
          <input id="date" name="date" type="date" defaultValue={defaultDate} required className="input" />
        </div>
        <div className="field" style={{ flex: "1 1 110px" }}>
          <label htmlFor="time">Uhrzeit</label>
          <input
            id="time"
            name="time"
            className="input"
            placeholder={isSportartspezifisch ? "19:15" : "17:30"}
          />
        </div>
      </div>

      <label className="mt-3.5 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={repeats} onChange={(e) => setRepeats(e.target.checked)} />
        Wiederholt sich wöchentlich
      </label>

      {repeats && (
        <div className="field mt-3.5">
          <label htmlFor="repeat_until">Wiederholen bis</label>
          <input id="repeat_until" name="repeat_until" type="date" className="input" />
          <p className="mt-1.5 text-xs text-muted">
            Legt für jede Woche bis zu diesem Datum einen eigenen Entwurf an. Die
            Übungstabelle, die du als Nächstes ausfüllst, wird automatisch auf alle noch leeren
            Termine der Serie übertragen.
          </p>
        </div>
      )}

      <div className="mt-4">
        <span className="mb-1.5 block text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 70%, transparent)" }}>
          Für wen?
        </span>
        <div className="seg">
          <label className="seg-opt">
            <input
              type="radio"
              name="scope_type"
              value="group"
              checked={scopeType === "group"}
              onChange={() => setScopeType("group")}
            />
            Gruppe
          </label>
          <label className="seg-opt">
            <input
              type="radio"
              name="scope_type"
              value="athlete"
              checked={scopeType === "athlete"}
              onChange={() => setScopeType("athlete")}
            />
            Einzelner Athlet
          </label>
        </div>
      </div>

      {scopeType === "group" ? (
        <div className="mt-3.5">
          <span className="mb-1.5 block text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 70%, transparent)" }}>
            Gruppe{groups.length > 1 ? "n" : ""} — Mehrfachauswahl möglich
          </span>
          <div className="flex flex-col gap-1.5">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="group_ids" value={g.id} />
                {g.name}
              </label>
            ))}
          </div>
          {groups.length === 0 && (
            <p className="mt-1.5 text-xs text-muted">
              Noch keine Gruppe vorhanden — lege zuerst eine Gruppe an.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3.5">
          <span className="mb-1.5 block text-xs" style={{ color: "color-mix(in srgb, var(--dc-text) 70%, transparent)" }}>
            Athlet{athletes.length > 1 ? "en" : ""} — Mehrfachauswahl möglich
          </span>
          <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
            {athletes.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="athlete_ids" value={a.id} />
                {a.full_name}
              </label>
            ))}
          </div>
          {athletes.length === 0 && (
            <p className="mt-1.5 text-xs text-muted">Noch kein Athlet in einer deiner Gruppen.</p>
          )}
        </div>
      )}

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
