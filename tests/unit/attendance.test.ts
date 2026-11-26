import { describe, expect, it } from "vitest";
import { computeQuotas, dateChunks, formatTimeRange, periodRange } from "@/lib/attendance";

const s = (id: string, date: string, cancelled = false) => ({ id, date, cancelled_at: cancelled ? "2026-11-01T00:00:00Z" : null });

describe("computeQuotas", () => {
  it("counts everyone present except recorded absences, only for held sessions", () => {
    const sessions = [s("a", "2026-11-23"), s("b", "2026-11-24"), s("c", "2026-11-25", true), s("d", "2026-11-30")];
    const absences = [
      { session_id: "a", athlete_id: "x" },
      { session_id: "c", athlete_id: "x" }, // removed session: ignored
      { session_id: "d", athlete_id: "y" }, // future: ignored
    ];
    const q = computeQuotas(sessions, absences, ["x", "y"], "2026-11-26");
    expect(q.get("x")).toEqual({ present: 1, total: 2, pct: 50 });
    expect(q.get("y")).toEqual({ present: 2, total: 2, pct: 100 });
  });

  it("has no percentage without held sessions", () => {
    expect(computeQuotas([s("d", "2026-12-01")], [], ["x"], "2026-11-26").get("x")).toEqual({ present: 0, total: 0, pct: null });
  });
});

describe("periodRange", () => {
  it("never starts before the roster's first day", () => {
    expect(periodRange("month", "2026-11-26", "2026-11-26")).toEqual({ from: "2026-11-01", to: "2026-11-26" });
    expect(periodRange("4weeks", "2026-11-26", "2026-11-26")).toEqual({ from: "2026-11-26", to: "2026-11-26" });
    expect(periodRange("4weeks", "2027-01-31", "2026-11-26")).toEqual({ from: "2027-01-04", to: "2027-01-31" });
    expect(periodRange("all", "2027-01-31", "2026-11-26")).toEqual({ from: "2026-11-26", to: "2027-01-31" });
  });
});

describe("dateChunks", () => {
  it("splits long ranges into gap-free chunks", () => {
    expect(dateChunks("2026-01-01", "2026-01-05", 2)).toEqual([
      { from: "2026-01-01", to: "2026-01-02" },
      { from: "2026-01-03", to: "2026-01-04" },
      { from: "2026-01-05", to: "2026-01-05" },
    ]);
    expect(dateChunks("2026-01-05", "2026-01-01")).toEqual([]);
  });
});

it("formats time ranges", () => {
  expect(formatTimeRange("18:00:00", "19:30:00")).toBe("18:00–19:30");
});
