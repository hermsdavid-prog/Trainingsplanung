"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { HealthLog } from "@/lib/health-status";

function MiniChart({
  data,
  dataKey,
  domain,
}: {
  data: HealthLog[];
  dataKey: "wellbeing" | "hrv" | "resting_hr";
  domain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={78}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" hide />
        <YAxis hide domain={domain ?? ["auto", "auto"]} />
        <Tooltip labelFormatter={(label) => label} contentStyle={{ fontSize: 12, padding: "4px 8px", borderRadius: 2 }} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="#0088b0"
          strokeWidth={1.25}
          fill="#e9f8ff"
          dot={false}
          connectNulls
          activeDot={{ r: 4, stroke: "#f3f2f2", strokeWidth: 1.5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HealthChart({ data }: { data: HealthLog[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <div>
        <p className="kicker-muted mb-1.5">Wohlbefinden</p>
        <MiniChart data={data} dataKey="wellbeing" domain={[1, 10]} />
      </div>
      <div>
        <p className="kicker-muted mb-1.5">HRV</p>
        <MiniChart data={data} dataKey="hrv" />
      </div>
      <div>
        <p className="kicker-muted mb-1.5">Ruhe-HF</p>
        <MiniChart data={data} dataKey="resting_hr" />
      </div>
    </div>
  );
}
