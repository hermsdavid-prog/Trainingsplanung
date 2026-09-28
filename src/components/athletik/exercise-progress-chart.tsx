"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDateCompact } from "@/lib/date";
import { ChartTooltip, CHART_CURSOR } from "@/components/charts/chart-tooltip";

type Point = { date: string; value: number; unit: string | null };

export function ExerciseProgressChart({ data }: { data: Point[] }) {
  const unit = data.find((d) => d.unit)?.unit ?? "";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(value) => formatDateCompact(String(value))}
          tick={{ fontSize: 11, fill: "color-mix(in srgb, #201e1d 55%, transparent)" }}
        />
        <YAxis tick={{ fontSize: 11, fill: "color-mix(in srgb, #201e1d 55%, transparent)" }} domain={["auto", "auto"]} width={44} />
        <Tooltip
          content={<ChartTooltip unit={unit} />}
          cursor={CHART_CURSOR}
          wrapperStyle={{ outline: "none", zIndex: 10 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--dc-accent)"
          strokeWidth={1.5}
          fill="var(--dc-accent-100)"
          dot={{ r: 3, fill: "var(--dc-accent)", strokeWidth: 0 }}
          activeDot={{ r: 5.5, stroke: "#fff", strokeWidth: 2, fill: "var(--dc-accent)" }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
