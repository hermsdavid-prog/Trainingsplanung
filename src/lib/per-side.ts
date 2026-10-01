// Unilateral exercises ("8-12 Wdh. je Seite", "30 Sek. pro Bein") are logged
// as one set with a left and a right row instead of every side counting as
// a set of its own. The plan's reps text is what marks an exercise as such,
// so trainers switch it on simply by writing "je Seite" (or pro Bein/Arm).
export type Side = "links" | "rechts";

export function isPerSide(spec: string | null | undefined): boolean {
  return /\b(je|pro)\s+(seite|bein|arm)\b/i.test(spec ?? "");
}

export const SIDE_LABEL: Record<Side, string> = { links: "Links", rechts: "Rechts" };

// A "rechts" row belongs to the "links" row right before it (consecutive
// set_numbers, see exercise_results.side).
export function isPairedRight<T extends { side?: Side | null }>(rows: T[], i: number): boolean {
  return rows[i]?.side === "rechts" && rows[i - 1]?.side === "links";
}

// Number of sets as the athlete sees them: every left+right pair counts
// once. With `done`, only sets for which every row passes are counted (a
// pair is finished once both sides are).
export function countSets<T extends { side?: Side | null }>(rows: T[], done?: (row: T) => boolean): number {
  let n = 0;
  rows.forEach((r, i) => {
    if (isPairedRight(rows, i)) return;
    const members = isPairedRight(rows, i + 1) ? [r, rows[i + 1]] : [r];
    if (!done || members.every(done)) n += 1;
  });
  return n;
}

// The editor's "je Seite" checkbox: adds or removes the marker in the reps
// text, so the text the athletes read and the left/right logging always
// agree (and copies, templates and series pick it up with the text).
export function withPerSide(spec: string, on: boolean): string {
  if (on) return isPerSide(spec) ? spec : `${spec.trim()} je Seite`.trim();
  return spec.replace(/\s*\b(je|pro)\s+(seite|bein|arm)\b/gi, "").trim();
}
