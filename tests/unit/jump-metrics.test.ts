import { describe, expect, it } from "vitest";
import { computeRsi, jumpMetrics, parseDecimal, withJumpMetric } from "@/lib/jump-metrics";
import { testUnit } from "@/lib/test-unit";
import { isPerSide } from "@/lib/per-side";

describe("jumpMetrics", () => {
  it("reads the markers from the Messgröße", () => {
    expect(jumpMetrics("cm")).toEqual({ contact: false, rsi: false });
    expect(jumpMetrics("cm · Kontaktzeit · RSI")).toEqual({ contact: true, rsi: true });
    expect(jumpMetrics("cm, ms, RSI")).toEqual({ contact: true, rsi: true });
    expect(jumpMetrics("Kontakt")).toEqual({ contact: true, rsi: false });
  });

  it("toggles markers without touching the rest", () => {
    expect(withJumpMetric("cm", "contact", true)).toBe("cm · Kontaktzeit");
    expect(withJumpMetric("", "rsi", true)).toBe("cm · RSI");
    expect(withJumpMetric("cm · Kontaktzeit · RSI", "contact", false)).toBe("cm · RSI");
    expect(withJumpMetric("cm · Kontaktzeit · RSI", "rsi", false)).toBe("cm · Kontaktzeit");
    expect(withJumpMetric("cm je Seite", "rsi", true)).toBe("cm je Seite · RSI");
  });

  it("keeps unit and per-side detection working", () => {
    const spec = "cm je Seite · Kontaktzeit · RSI";
    expect(testUnit(spec)).toBe("cm");
    expect(isPerSide(spec)).toBe(true);
  });
});

describe("computeRsi", () => {
  it("is height in m over contact time in s", () => {
    expect(computeRsi(30, 200)).toBe(1.5);
    expect(computeRsi(42.5, 180)).toBe(2.36);
  });
  it("needs both values", () => {
    expect(computeRsi(null, 200)).toBeNull();
    expect(computeRsi(30, 0)).toBeNull();
  });
});

describe("parseDecimal", () => {
  it("accepts a German comma", () => {
    expect(parseDecimal("42,5")).toBe(42.5);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("x")).toBeNull();
  });
});
