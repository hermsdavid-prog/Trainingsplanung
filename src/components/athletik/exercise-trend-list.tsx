import Link from "next/link";
import type { ExerciseTrend } from "@/lib/exercise-trend";

export function ExerciseTrendList({
  trends,
  href,
}: {
  trends: ExerciseTrend[];
  href: (exerciseId: string) => string;
}) {
  if (trends.length === 0) {
    return <p className="text-sm text-muted">Noch keine Athletik-Ergebnisse eingetragen.</p>;
  }

  return (
    <div>
      {trends.map((trend) => {
        const isUp = trend.delta != null && trend.delta > 0;
        const isDown = trend.delta != null && trend.delta < 0;
        return (
          <Link key={trend.exerciseId} href={href(trend.exerciseId)} className="exrow">
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="text-[16px]">{trend.exerciseName}</span>
              <span
                className="text-[12px]"
                style={{
                  color: isUp
                    ? "var(--dc-accent-700)"
                    : isDown
                      ? "var(--dc-accent-2-700)"
                      : "color-mix(in srgb, var(--dc-text) 55%, transparent)",
                }}
              >
                {trend.latestValue}
                {trend.unit ? ` ${trend.unit}` : ""}
                {trend.delta != null && (
                  <> · {trend.delta > 0 ? "+" : ""}{trend.delta}{trend.unit ? ` ${trend.unit}` : ""}</>
                )}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
