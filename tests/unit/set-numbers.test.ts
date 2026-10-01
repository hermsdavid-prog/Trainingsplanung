import { describe, expect, it } from "vitest";
import { occurrenceOfSet, setNumberBase } from "@/lib/set-numbers";

describe("set number blocks", () => {
  it("gives every occurrence its own block", () => {
    expect(setNumberBase(0)).toBe(0);
    expect(setNumberBase(1)).toBe(100);
    expect(occurrenceOfSet(3, 2)).toBe(0);
    expect(occurrenceOfSet(101, 2)).toBe(1);
  });

  it("keeps sets of a removed occurrence on the last one that exists", () => {
    expect(occurrenceOfSet(205, 2)).toBe(1);
    expect(occurrenceOfSet(105, 1)).toBe(0);
  });
});
