import { describe, expect, it } from "vitest";
import { formatNumber } from "@/lib/format";

describe("formatNumber", () => {
  it("uses a decimal comma and thousands dots", () => {
    expect(formatNumber(82.5)).toBe("82,5");
    expect(formatNumber(1173)).toBe("1.173");
    expect(formatNumber("41.5")).toBe("41,5");
    expect(formatNumber("58,5")).toBe("58,5");
  });
  it("caps at two decimals and handles empty values", () => {
    expect(formatNumber(99.1666)).toBe("99,17");
    expect(formatNumber(null)).toBe("");
    expect(formatNumber("")).toBe("");
  });
});
