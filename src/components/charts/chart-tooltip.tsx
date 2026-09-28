"use client";

import { formatDateShort } from "@/lib/date";

// Shared value popup for every Recharts chart in the app: the exact date and
// value (with unit) of the point under the cursor — or under the finger on a
// phone, where Recharts drives the tooltip from touch events too.
export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  name,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: unknown; payload?: { date?: string } }>;
  label?: unknown;
  unit?: string;
  name?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  if (value == null || value === "") return null;
  const date = typeof label === "string" ? label : payload[0]?.payload?.date;

  return (
    <div
      className="px-2.5 py-1.5"
      style={{
        background: "var(--dc-surface)",
        border: "1px solid var(--dc-divider)",
        boxShadow: "var(--dc-shadow-md)",
        borderRadius: 2,
        pointerEvents: "none",
      }}
    >
      {date && (
        <div className="text-[11px] tabular-nums" style={{ color: "var(--dc-muted)" }}>
          {formatDateShort(String(date))}
        </div>
      )}
      <div className="text-[15px] font-semibold tabular-nums" style={{ color: "var(--dc-text)" }}>
        {name ? <span className="mr-1.5 text-[12px] font-normal" style={{ color: "var(--dc-muted)" }}>{name}</span> : null}
        {String(value).replace(".", ",")}
        {unit ? <span className="ml-1 text-[12px] font-normal">{unit}</span> : null}
      </div>
    </div>
  );
}

export const CHART_CURSOR = { stroke: "var(--dc-accent)", strokeDasharray: "3 3" };
