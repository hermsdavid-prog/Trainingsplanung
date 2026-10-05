import { describe, expect, it } from "vitest";
import { testUnit } from "@/lib/test-unit";

describe("testUnit", () => {
  it("uses the plan's measure", () => {
    expect(testUnit("cm")).toBe("cm");
    expect(testUnit("Sek.")).toBe("Sek.");
    expect(testUnit("RSI")).toBe("RSI");
    expect(testUnit("Sprunghöhe (cm)")).toBe("cm");
    expect(testUnit("Zeit in s")).toBe("s");
  });

  it("falls back to cm", () => {
    expect(testUnit("")).toBe("cm");
    expect(testUnit(null)).toBe("cm");
    expect(testUnit("3 Versuche, bester zählt")).toBe("cm");
  });
});
