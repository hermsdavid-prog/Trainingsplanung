import { describe, expect, it } from "vitest";
import { EXERCISE_ANIMATIONS, cycleLength, poseAt, solve } from "@/lib/exercise-animations";

const entries = Object.entries(EXERCISE_ANIMATIONS);

function sample(key: string, n = 40) {
  const anim = EXERCISE_ANIMATIONS[key];
  const total = cycleLength(anim);
  return Array.from({ length: n }, (_, i) => solve(anim, poseAt(anim, (total * i) / n)));
}

describe("exercise animations", () => {
  it.each(entries)("%s keeps its anchor joint fixed and stays finite", (key, anim) => {
    for (const j of sample(key)) {
      for (const p of Object.values(j)) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      }
      if (!anim.frames.some((f) => f.lift || f.shift)) {
        expect(j[anim.anchor].x).toBeCloseTo(anim.anchorAt.x, 6);
        expect(j[anim.anchor].y).toBeCloseTo(anim.anchorAt.y, 6);
      }
    }
  });

  it.each(entries)("%s never puts the body through the floor", (key, anim) => {
    if (key === "klimmzuege") return; // hangs from the bar, no floor drawn
    for (const j of sample(key)) {
      for (const [name, p] of Object.entries(j)) {
        expect(p.y, `${anim.label}: ${name}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("starts and ends each cycle on the first key position", () => {
    for (const [, anim] of entries) {
      const total = cycleLength(anim);
      expect(poseAt(anim, total)).toEqual(poseAt(anim, 0));
    }
  });

  it("push-up hands stay on the floor (within 2 units)", () => {
    const wrists = sample("liegestuetz").map((j) => j.wrist);
    const xs = wrists.map((w) => w.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(2);
    for (const w of wrists) expect(Math.abs(w.y + 5.3)).toBeLessThan(2);
  });

  it("deadlift bar starts on the floor and stays over the mid-foot", () => {
    const start = solve(EXERCISE_ANIMATIONS.kreuzheben, EXERCISE_ANIMATIONS.kreuzheben.frames[0]);
    expect(start.wrist.y).toBeCloseTo(-21, 0);
    for (const j of sample("kreuzheben")) expect(Math.abs(j.wrist.x)).toBeLessThan(12);
  });

  it("split squat back foot stays near the bench", () => {
    for (const j of sample("bulgarian-split-squat")) {
      expect(Math.hypot(j.ankle2.x + 60, j.ankle2.y + 52)).toBeLessThan(8);
    }
  });
});
