export type ExerciseResultRow = {
  exercise_id: string;
  exercise_name: string;
  date: string;
  value: number;
  unit: string | null;
};

export type ExerciseTrend = {
  exerciseId: string;
  exerciseName: string;
  latestDate: string;
  latestValue: number;
  unit: string | null;
  previousValue: number | null;
  delta: number | null;
};

// Compares each exercise's most recent result against the one before it, so the
// dashboard can show at a glance whether an athlete is trending up or down.
export function computeExerciseTrends(rows: ExerciseResultRow[]): ExerciseTrend[] {
  const byExercise = new Map<string, ExerciseResultRow[]>();
  for (const row of rows) {
    byExercise.set(row.exercise_id, [...(byExercise.get(row.exercise_id) ?? []), row]);
  }

  const trends: ExerciseTrend[] = [];
  for (const points of byExercise.values()) {
    const sorted = [...points].sort((a, b) => (a.date < b.date ? 1 : -1));
    const latest = sorted[0];
    const previous = sorted[1] ?? null;
    trends.push({
      exerciseId: latest.exercise_id,
      exerciseName: latest.exercise_name,
      latestDate: latest.date,
      latestValue: latest.value,
      unit: latest.unit,
      previousValue: previous?.value ?? null,
      delta: previous ? latest.value - previous.value : null,
    });
  }

  return trends.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}
