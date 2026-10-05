"use client";

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis } from "recharts";

type Point = { load: number; velocity: number };

// Load-velocity profile: logged sets as dots (recent window highlighted)
// and the fitted line from the lightest load to the estimated 1RM.
export function VbtProfileChart({
  recent,
  older,
  line,
  unit,
}: {
  recent: Point[];
  older: Point[];
  line: Point[];
  unit: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <XAxis
          type="number"
          dataKey="load"
          name="Last"
          domain={["auto", "auto"]}
          tickFormatter={(v) => `${v} ${unit}`}
          tick={{ fontSize: 11, fill: "var(--dc-muted)" }}
        />
        <YAxis
          type="number"
          dataKey="velocity"
          name="Geschwindigkeit"
          domain={[0, "auto"]}
          width={48}
          tickFormatter={(v) => Number(v).toFixed(2).replace(".", ",")}
          label={{ value: "m/s", position: "insideTopLeft", offset: 0, fontSize: 11, fill: "var(--dc-muted)" }}
          tick={{ fontSize: 11, fill: "var(--dc-muted)" }}
        />
        <ZAxis range={[36, 36]} />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(value, name) =>
            name === "Geschwindigkeit"
              ? `${Number(value).toFixed(2).replace(".", ",")} m/s`
              : `${String(value).replace(".", ",")} ${unit}`
          }
          contentStyle={{ background: "var(--dc-surface)", border: "1px solid var(--dc-divider)", fontSize: 12 }}
        />
        {older.length > 0 && <Scatter name="Älter" data={older} fill="var(--dc-neutral-300)" />}
        <Scatter name="Letzte 8 Wochen" data={recent} fill="var(--dc-accent)" />
        {line.length === 2 && (
          <Scatter
            name="Profil"
            data={line}
            line={{ stroke: "var(--dc-accent-700)", strokeWidth: 1.5, strokeDasharray: "5 4" }}
            shape={() => <g />}
            legendType="none"
            isAnimationActive={false}
          />
        )}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
