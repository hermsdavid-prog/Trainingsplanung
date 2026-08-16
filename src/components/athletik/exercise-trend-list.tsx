import Link from "next/link";
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";
import type { ExerciseTrend } from "@/lib/exercise-trend";

export function ExerciseTrendList({
  trends,
  href,
}: {
  trends: ExerciseTrend[];
  href: (exerciseId: string) => string;
}) {
  if (trends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine Athletik-Ergebnisse eingetragen.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y rounded-md border">
      {trends.map((trend) => {
        const isUp = trend.delta != null && trend.delta > 0;
        const isDown = trend.delta != null && trend.delta < 0;
        return (
          <Link
            key={trend.exerciseId}
            href={href(trend.exerciseId)}
            className="flex items-center justify-between gap-2 p-3 text-sm hover:bg-muted/50"
          >
            <span className="font-medium">{trend.exerciseName}</span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span>
                {trend.latestValue}
                {trend.unit ? ` ${trend.unit}` : ""}
              </span>
              {trend.delta != null && (
                <span
                  className={
                    isUp
                      ? "flex items-center gap-0.5 text-emerald-600"
                      : isDown
                        ? "flex items-center gap-0.5 text-red-600"
                        : "flex items-center gap-0.5"
                  }
                >
                  {isUp && <TrendingUpIcon className="size-3.5" />}
                  {isDown && <TrendingDownIcon className="size-3.5" />}
                  {!isUp && !isDown && <MinusIcon className="size-3.5" />}
                  {trend.delta > 0 ? "+" : ""}
                  {trend.delta}
                  {trend.unit ? ` ${trend.unit}` : ""}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
