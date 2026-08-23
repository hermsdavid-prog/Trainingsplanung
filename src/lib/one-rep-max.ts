// Epley formula — a standard estimate for 1-rep max from a submaximal set.
// Exact when reps = 1 (the weight itself); increasingly approximate as reps
// grow, and not meaningful past ~12 reps where the assumption behind it
// breaks down, so no estimate is returned beyond that.
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(reps) || reps <= 0) return null;
  if (reps === 1) return weight;
  if (reps > 12) return null;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}
