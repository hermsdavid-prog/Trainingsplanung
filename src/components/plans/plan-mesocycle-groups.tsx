"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateShort, formatDateCompact, shiftDateISO } from "@/lib/date";
import { DeletePlanRowButton } from "@/components/plans/delete-plan-row-button";
import { PlanOccurrenceDropdown } from "@/components/plans/plan-occurrence-dropdown";

const MUTED = { color: "color-mix(in srgb, var(--dc-text) 65%, transparent)" };

export type PlanGroupRow = {
  key: string;
  title: string;
  time: string | null;
  forLabel: string;
  occurrences: { id: string; date: string; created_by: string | null }[];
};

export type PlanMesocycleSection = {
  mesocycleId: string;
  title: string;
  startDate: string;
  weeks: number;
  isCurrent: boolean;
  // Group name (or "Persönlich · Athlet") and the group's colour.
  scopeLabel: string;
  scopeColor: string | null;
  groups: PlanGroupRow[];
};

function PlanRowsTable({ groups, canDelete }: { groups: PlanGroupRow[]; canDelete: boolean }) {
  return (
    <table className="table" style={{ minWidth: 560 }}>
      <thead>
        <tr>
          <th>Datum</th>
          <th>Zeit</th>
          <th>Titel</th>
          <th>Für</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => {
          if (group.occurrences.length === 1) {
            const plan = group.occurrences[0];
            return (
              <tr key={group.key}>
                <td style={MUTED}>{formatDateShort(plan.date)}</td>
                <td style={MUTED}>{group.time || "—"}</td>
                <td className="text-[15px]">
                  {/* The title itself opens the plan — on a phone the row
                      actions sit off-screen behind a horizontal scroll. */}
                  <Link href={`/trainer/plans/${plan.id}/edit`} className="no-underline hover:underline" style={{ color: "inherit" }}>
                    {group.title}
                  </Link>
                </td>
                <td className="text-sm" style={MUTED}>
                  {group.forLabel}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/trainer/plans/${plan.id}/edit`} className="btn btn-ghost">
                      Bearbeiten
                    </Link>
                    {canDelete && <DeletePlanRowButton planId={plan.id} title={group.title} />}
                  </div>
                </td>
              </tr>
            );
          }
          return (
            <tr key={group.key}>
              <td colSpan={2}>
                <PlanOccurrenceDropdown occurrences={group.occurrences} />
              </td>
              <td className="text-[15px]">
                {group.title}
                {group.time && (
                  <div className="mt-0.5 text-xs" style={MUTED}>
                    {group.time}
                  </div>
                )}
              </td>
              <td className="text-sm" style={MUTED}>
                {group.forLabel}
              </td>
              <td></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MesocycleSection({ section, canDelete }: { section: PlanMesocycleSection; canDelete: boolean }) {
  // Always starts collapsed — the headers alone (block, group, dates, count)
  // are the overview; a tap opens the trainings.
  const [open, setOpen] = useState(false);
  const count = section.groups.length;

  return (
    <div
      style={{
        background: "var(--dc-surface)",
        border: "1px solid var(--dc-divider)",
        borderLeft: `3px solid ${section.scopeColor ?? "var(--dc-neutral-400)"}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3.5 p-[13px_16px]"
        style={{ background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="text-[15.5px]" style={{ overflowWrap: "anywhere" }}>
              {section.title}
            </span>
            {section.isCurrent && (
              <span className="tag tag-neutral" style={{ flex: "none" }}>
                läuft
              </span>
            )}
          </div>
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold">
            <span
              aria-hidden
              className="inline-block size-2 flex-none rounded-full"
              style={{ background: section.scopeColor ?? "var(--dc-neutral-400)" }}
            />
            <span className="truncate">{section.scopeLabel}</span>
          </span>
          <span className="text-xs" style={MUTED}>
            {formatDateCompact(section.startDate)} –{" "}
            {formatDateCompact(shiftDateISO(section.startDate, section.weeks * 7 - 1))} · {section.weeks}{" "}
            {section.weeks === 1 ? "Woche" : "Wochen"}
          </span>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <span className="text-xs" style={MUTED}>
            {count} {count === 1 ? "Training" : "Trainings"}
          </span>
          <span style={{ fontSize: 13, color: "var(--dc-text)" }}>{open ? "▴" : "▾"}</span>
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto border-t" style={{ borderColor: "var(--dc-divider)" }}>
          <PlanRowsTable groups={section.groups} canDelete={canDelete} />
        </div>
      )}
    </div>
  );
}

export function PlanMesocycleGroups({
  sections,
  unassigned,
  canDelete,
  emptyMessage,
}: {
  sections: PlanMesocycleSection[];
  unassigned: PlanGroupRow[];
  canDelete: boolean;
  emptyMessage: string;
}) {
  // Collapsed like the Mesozyklen, unless it's the only section there is.
  const [unassignedOpen, setUnassignedOpen] = useState(sections.length === 0);

  if (sections.length === 0 && unassigned.length === 0) {
    return <p className="mt-5 text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      {sections.map((section) => (
        <MesocycleSection key={section.mesocycleId} section={section} canDelete={canDelete} />
      ))}

      {unassigned.length > 0 && (
        <div style={{ background: "var(--dc-surface)", border: "1px solid var(--dc-divider)" }}>
          <button
            type="button"
            onClick={() => setUnassignedOpen((v) => !v)}
            aria-expanded={unassignedOpen}
            className="flex w-full items-center justify-between gap-3.5 p-[13px_16px]"
            style={{ background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}
          >
            <span className="text-[15.5px] italic" style={MUTED}>
              Ohne Mesozyklus
            </span>
            <div className="flex flex-none items-center gap-2.5">
              <span className="text-xs" style={MUTED}>
                {unassigned.length} {unassigned.length === 1 ? "Training" : "Trainings"}
              </span>
              <span style={{ fontSize: 13, color: "var(--dc-text)" }}>{unassignedOpen ? "▴" : "▾"}</span>
            </div>
          </button>
          {unassignedOpen && (
            <div className="overflow-x-auto border-t" style={{ borderColor: "var(--dc-divider)" }}>
              <PlanRowsTable groups={unassigned} canDelete={canDelete} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
