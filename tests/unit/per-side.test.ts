import { describe, expect, it } from "vitest";
import { countSets, isPerSide, withPerSide } from "@/lib/per-side";

describe("isPerSide", () => {
  it("recognises the usual ways a plan says 'each side'", () => {
    expect(isPerSide("8-12 Wdh. je Seite")).toBe(true);
    expect(isPerSide("10 pro Bein")).toBe(true);
    expect(isPerSide("30 Sek. je Arm")).toBe(true);
    expect(isPerSide("8-12 Wdh. JE SEITE")).toBe(true);
  });

  it("leaves normal exercises alone", () => {
    expect(isPerSide("8-12 Wdh.")).toBe(false);
    expect(isPerSide("")).toBe(false);
    expect(isPerSide(null)).toBe(false);
    expect(isPerSide("Seitstütz 30 Sek.")).toBe(false);
  });
});

describe("countSets", () => {
  it("counts a left/right pair once", () => {
    expect(countSets([{ side: "links" }, { side: "rechts" }, { side: "links" }, { side: "rechts" }])).toBe(2);
  });

  it("counts unpaired and plain rows individually", () => {
    expect(countSets([{ side: null }, { side: null }])).toBe(2);
    expect(countSets([{ side: "rechts" }, { side: "links" }])).toBe(2);
    expect(countSets([{ side: "links" }])).toBe(1);
  });
});

describe("countSets with a done predicate", () => {
  it("counts a pair only once both sides are done", () => {
    const rows = [
      { side: "links" as const, ok: true },
      { side: "rechts" as const, ok: false },
      { side: "links" as const, ok: true },
      { side: "rechts" as const, ok: true },
      { side: null, ok: true },
    ];
    expect(countSets(rows, (r) => r.ok)).toBe(2);
  });
});

describe("withPerSide", () => {
  it("adds the marker once", () => {
    expect(withPerSide("8-12 Wdh.", true)).toBe("8-12 Wdh. je Seite");
    expect(withPerSide("8-12 Wdh. je Seite", true)).toBe("8-12 Wdh. je Seite");
    expect(withPerSide("", true)).toBe("je Seite");
  });

  it("removes any spelling of it", () => {
    expect(withPerSide("8-12 Wdh. je Seite", false)).toBe("8-12 Wdh.");
    expect(withPerSide("10 pro Bein", false)).toBe("10");
    expect(withPerSide("8-12 Wdh.", false)).toBe("8-12 Wdh.");
  });
});
