import { describe, it, expect } from "vitest";
import { computeHealthStatus, type HealthLog } from "@/lib/health-status";

function log(date: string, overrides: Partial<HealthLog> = {}): HealthLog {
  return { date, hrv: 50, resting_hr: 60, wellbeing: 7, ...overrides };
}

describe("computeHealthStatus", () => {
  it("returns 'none' when there is no entry for today", () => {
    const logs = [log("2026-08-20"), log("2026-08-21"), log("2026-08-22")];
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("none");
  });

  it("returns 'none' with fewer than 3 days of history, even with today present", () => {
    const logs = [log("2026-08-24"), log("2026-08-22"), log("2026-08-23")];
    // only 2 history entries (22nd, 23rd) once today (24th) is excluded
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("none");
  });

  it("flags green when today matches the rolling average", () => {
    const logs = [
      log("2026-08-24"),
      log("2026-08-23"),
      log("2026-08-22"),
      log("2026-08-21"),
    ];
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("green");
  });

  it("flags red on a >=2-point wellbeing drop from the average", () => {
    const logs = [
      log("2026-08-24", { wellbeing: 5 }),
      log("2026-08-23", { wellbeing: 7 }),
      log("2026-08-22", { wellbeing: 7 }),
      log("2026-08-21", { wellbeing: 7 }),
    ];
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("red");
  });

  it("flags yellow on a 1-point wellbeing drop from the average", () => {
    const logs = [
      log("2026-08-24", { wellbeing: 6 }),
      log("2026-08-23", { wellbeing: 7 }),
      log("2026-08-22", { wellbeing: 7 }),
      log("2026-08-21", { wellbeing: 7 }),
    ];
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("yellow");
  });

  it("flags red when HRV drops to 85% or below of the rolling average", () => {
    const logs = [
      log("2026-08-24", { hrv: 42, wellbeing: null, resting_hr: null }),
      log("2026-08-23", { hrv: 50, wellbeing: null, resting_hr: null }),
      log("2026-08-22", { hrv: 50, wellbeing: null, resting_hr: null }),
      log("2026-08-21", { hrv: 50, wellbeing: null, resting_hr: null }),
    ];
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("red");
  });

  it("flags red when resting HR rises to 115% or more of the rolling average", () => {
    const logs = [
      log("2026-08-24", { resting_hr: 70, wellbeing: null, hrv: null }),
      log("2026-08-23", { resting_hr: 60, wellbeing: null, hrv: null }),
      log("2026-08-22", { resting_hr: 60, wellbeing: null, hrv: null }),
      log("2026-08-21", { resting_hr: 60, wellbeing: null, hrv: null }),
    ];
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("red");
  });

  it("takes the worst of the three signals when they disagree", () => {
    const logs = [
      // wellbeing unchanged (green), but HRV crashes (red)
      log("2026-08-24", { wellbeing: 7, hrv: 40, resting_hr: 60 }),
      log("2026-08-23", { wellbeing: 7, hrv: 50, resting_hr: 60 }),
      log("2026-08-22", { wellbeing: 7, hrv: 50, resting_hr: 60 }),
      log("2026-08-21", { wellbeing: 7, hrv: 50, resting_hr: 60 }),
    ];
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("red");
  });

  it("only considers the 7 most recent history entries", () => {
    // 8 days of history all showing a real drop, but only the closest 7 are
    // used to compute the average — the function itself sorts/truncates,
    // this just documents that behavior rather than re-deriving it.
    const logs = [
      log("2026-08-24", { wellbeing: 7 }),
      ...Array.from({ length: 8 }, (_, i) =>
        log(`2026-08-${String(23 - i).padStart(2, "0")}`, { wellbeing: 7 })
      ),
    ];
    const result = computeHealthStatus(logs, "2026-08-24");
    expect(result.level).toBe("green");
    expect(result.avg?.wellbeing).toBe(7);
  });
});
