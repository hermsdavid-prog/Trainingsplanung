"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ReadinessRow = {
  athleteId: string;
  groupId: string;
  fullName: string;
  level: "red" | "yellow" | "green" | "none";
  levelLabel: string;
  levelTagClass: string;
  todayLabel: string;
};

// Collapsible so the overview page doesn't get overwhelming as the roster
// grows — one row per athlete otherwise pushes everything else below the
// fold. Expanded by default only when something needs attention (a red
// reading); the header summary line already surfaces that count either way.
export function ReadinessPanel({ rows }: { rows: ReadinessRow[] }) {
  const redCount = rows.filter((r) => r.level === "red").length;
  const [open, setOpen] = useState(redCount > 0);
  const router = useRouter();

  return (
    <div className="mt-8">
      <button
        type="button"
        className="kicker-muted flex w-full items-center justify-between gap-2"
        style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, textAlign: "left" }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Trainingsbereitschaft ({rows.length})</span>
        <span>{open ? "▴" : "▾"}</span>
      </button>

      {open &&
        (rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Noch keine Athleten in deinen Gruppen.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="table" style={{ minWidth: 480 }}>
              <thead>
                <tr>
                  <th>Athlet</th>
                  <th>Bereitschaft</th>
                  <th>Heute</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.athleteId}
                    onClick={() => router.push(`/trainer/athletes?group=${row.groupId}&athlete=${row.athleteId}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="text-[15px]">{row.fullName}</td>
                    <td>
                      <span className={`tag ${row.levelTagClass}`}>{row.levelLabel}</span>
                    </td>
                    <td className="text-[13px]" style={{ color: "color-mix(in srgb, var(--dc-text) 60%, transparent)" }}>
                      {row.todayLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
