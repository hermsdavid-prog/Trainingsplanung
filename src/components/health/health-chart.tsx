"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { HealthLog } from "@/lib/health-status";

function MiniChart({
  data,
  dataKey,
  color,
  domain,
}: {
  data: HealthLog[];
  dataKey: "wellbeing" | "hrv" | "resting_hr";
  color: string;
  domain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <XAxis dataKey="date" hide />
        <YAxis hide domain={domain ?? ["auto", "auto"]} />
        <Tooltip
          labelFormatter={(label) => label}
          contentStyle={{ fontSize: 12, padding: "4px 8px" }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HealthChart({ data }: { data: HealthLog[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Wohlbefinden</p>
        <MiniChart data={data} dataKey="wellbeing" color="#10b981" domain={[1, 10]} />
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">HRV</p>
        <MiniChart data={data} dataKey="hrv" color="#6366f1" />
      </div>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Ruheherzfrequenz</p>
        <MiniChart data={data} dataKey="resting_hr" color="#ef4444" />
      </div>
    </div>
  );
}
