import { describe, it, expect } from "vitest";
import { estimateOneRepMax } from "@/lib/one-rep-max";

describe("estimateOneRepMax", () => {
  it("returns the weight itself for a single rep", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it("estimates a higher 1RM for a multi-rep set (Epley formula)", () => {
    // 90kg x 5 -> 90 * (1 + 5/30) = 105
    expect(estimateOneRepMax(90, 5)).toBe(105);
  });

  it("rounds to one decimal place", () => {
    // 82 * (1 + 3/30) = 90.2
    expect(estimateOneRepMax(82, 3)).toBe(90.2);
  });

  it("returns null once reps exceeds the reliable range", () => {
    expect(estimateOneRepMax(50, 13)).toBeNull();
  });

  it("still estimates at the 12-rep boundary", () => {
    expect(estimateOneRepMax(50, 12)).not.toBeNull();
  });

  it("returns null for non-positive or missing inputs", () => {
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(-10, 5)).toBeNull();
    expect(estimateOneRepMax(50, 0)).toBeNull();
    expect(estimateOneRepMax(NaN, 5)).toBeNull();
    expect(estimateOneRepMax(50, NaN)).toBeNull();
  });
});
