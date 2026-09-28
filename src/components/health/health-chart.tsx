"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { HealthLog } from "@/lib/health-status";
import { formatDateCompact } from "@/lib/date";
import { ChartTooltip, CHART_CURSOR } from "@/components/charts/chart-tooltip";

type MetricKey = "wellbeing" | "hrv" | "resting_hr";

const MUTED = { color: "var(--dc-muted)" };

// A curve alone can't be read — each mini chart also shows its latest value
// and the span it moved in, the same way the trainer's athlete view does.
function MiniChart({
  data,
  dataKey,
  label,
  unit,
  domain,
}: {
  data: HealthLog[];
  dataKey: MetricKey;
  label: string;
  unit?: string;
  domain?: [number, number];
}) {
  const points = data.filter((d) => d[dataKey] != null);
  const latest = points[points.length - 1];
  const values = points.map((p) => p[dataKey] as number);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="kicker-muted">
          {label}
          {unit && <span className="ml-1.5 normal-case">{unit}</span>}
        </p>
        {latest && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[11px]" style={MUTED}>
              {formatDateCompact(latest.date)}
            </span>
            <span className="text-[19px] leading-none" style={{ fontFamily: "var(--dc-font-heading)" }}>
              {latest[dataKey]}
            </span>
          </span>
        )}
      </div>
      {points.length === 0 ? (
        <p className="py-5 text-xs" style={MUTED}>
          Noch keine Werte.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={78}>
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={domain ?? ["auto", "auto"]} />
              <Tooltip
                content={<ChartTooltip unit={unit} name={label} />}
                cursor={CHART_CURSOR}
                wrapperStyle={{ outline: "none", zIndex: 10 }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="var(--dc-accent)"
                strokeWidth={1.5}
                fill="var(--dc-accent-100)"
                dot={{ r: 2, fill: "var(--dc-accent)", strokeWidth: 0 }}
                connectNulls
                activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "var(--dc-accent)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {min != null && max != null && (
            <p className="mt-1 text-[11px]" style={MUTED}>
              {min === max ? `Konstant ${min}` : `Spanne ${min} bis ${max}`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function HealthChart({ data }: { data: HealthLog[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <MiniChart data={data} dataKey="wellbeing" label="Wohlbefinden" unit="von 10" domain={[1, 10]} />
      <MiniChart data={data} dataKey="hrv" label="HRV" unit="ms" />
      <MiniChart data={data} dataKey="resting_hr" label="Ruhe-HF" unit="Schläge/min" />
    </div>
  );
}
