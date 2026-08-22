"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDateCompact } from "@/lib/date";

export type TrendPoint = { date: string; value: number };


// A sparkline with a live header (date + value of the hovered — or by default
// latest — point) and a footer showing the date range and min/max span.
// Same accent-colored area/line technique already used by HealthChart and
// ExerciseProgressChart, wrapped so trainer-facing pages (Statistik,
// Gesundheit) can show the header/footer chrome the design calls for.
export function TrendChart({
  label,
  unit,
  data,
  domain,
  height = 150,
  todayDate,
}: {
  label?: string;
  unit?: string;
  data: TrendPoint[];
  domain?: [number, number];
  height?: number;
  todayDate?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-muted">Noch keine Werte vorhanden.</p>;
  }

  const lastIndex = data.length - 1;
  const activeIndex = hoverIndex ?? lastIndex;
  const active = data[activeIndex];
  const values = data.map((d) => d.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          {label && (
            <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
              {label}
            </span>
          )}
          {unit && (
            <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--dc-text) 45%, transparent)" }}>
              {unit}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[11px]" style={{ color: "color-mix(in srgb, var(--dc-text) 55%, transparent)" }}>
            {formatDateCompact(active.date)}
            {hoverIndex === null && active.date === todayDate ? " · heute" : ""}
          </span>
          <span className="font-semibold text-[22px] leading-none" style={{ fontFamily: "var(--dc-font-heading)" }}>
            {active.value}
          </span>
        </div>
      </div>

      <div className="mt-1.5">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            onMouseMove={(state) => {
              if (state?.isTooltipActive && typeof state.activeTooltipIndex === "number") {
                setHoverIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <XAxis dataKey="date" hide />
            <YAxis hide domain={domain ?? ["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: "var(--dc-accent)", strokeDasharray: "3 3" }}
              content={() => null}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--dc-accent)"
              strokeWidth={1.25}
              fill="var(--dc-accent-100)"
              dot={false}
              connectNulls
              activeDot={{ r: 4.5, stroke: "var(--dc-bg)", strokeWidth: 1.5, fill: "var(--dc-accent)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between text-[11px]" style={{ color: "color-mix(in srgb, var(--dc-text) 50%, transparent)" }}>
        <span>{formatDateCompact(data[0].date)}</span>
        <span>
          Spanne {lo}
          {lo !== hi ? ` bis ${hi}` : ""}
        </span>
        <span>{formatDateCompact(data[lastIndex].date)}</span>
      </div>
    </div>
  );
}
