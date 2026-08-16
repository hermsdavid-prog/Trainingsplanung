"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Point = { date: string; value: number; unit: string | null };

export function ExerciseProgressChart({ data }: { data: Point[] }) {
  const unit = data.find((d) => d.unit)?.unit ?? "";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} width={48} />
        <Tooltip
          formatter={(value) => [`${value}${unit ? ` ${unit}` : ""}`, "Ergebnis"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
