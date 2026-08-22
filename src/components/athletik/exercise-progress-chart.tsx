"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Point = { date: string; value: number; unit: string | null };

export function ExerciseProgressChart({ data }: { data: Point[] }) {
  const unit = data.find((d) => d.unit)?.unit ?? "";

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "color-mix(in srgb, #201e1d 55%, transparent)" }} />
        <YAxis tick={{ fontSize: 11, fill: "color-mix(in srgb, #201e1d 55%, transparent)" }} domain={["auto", "auto"]} width={44} />
        <Tooltip formatter={(value) => [`${value}${unit ? ` ${unit}` : ""}`, "Ergebnis"]} contentStyle={{ fontSize: 12, borderRadius: 2 }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#0088b0"
          strokeWidth={1.25}
          fill="#e9f8ff"
          dot={{ r: 3, fill: "#0088b0" }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
