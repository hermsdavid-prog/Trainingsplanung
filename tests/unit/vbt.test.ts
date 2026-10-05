import { describe, expect, it } from "vitest";
import {
  defaultMvt,
  estimateOneRmFromProfile,
  fitLoadVelocity,
  loadAt,
  readiness,
  suggestLoad,
  vbtSpec,
  velocityLoss,
  withVbt,
} from "@/lib/vbt";

describe("vbtSpec", () => {
  it("reads marker, target zone and loss limit", () => {
    expect(vbtSpec("3 Wdh.")).toEqual({ on: false, targetMin: null, targetMax: null, lossLimit: null });
    expect(vbtSpec("3 Wdh. · VBT 0,55-0,65 m/s · max. 20 % Verlust")).toEqual({
      on: true,
      targetMin: 0.55,
      targetMax: 0.65,
      lossLimit: 20,
    });
    expect(vbtSpec("3 Wdh. · VBT")).toEqual({ on: true, targetMin: null, targetMax: null, lossLimit: null });
    expect(vbtSpec("VBT 0.6 m/s")).toMatchObject({ targetMin: 0.6, targetMax: 0.6 });
  });

  it("toggles the marker", () => {
    expect(withVbt("3 Wdh.", true)).toBe("3 Wdh. · VBT");
    expect(withVbt("", true)).toBe("VBT");
    expect(withVbt("3 Wdh. · VBT 0,55-0,65 m/s · max. 20 % Verlust", false)).toBe("3 Wdh.");
    expect(withVbt("3 Wdh. je Seite · VBT", false)).toBe("3 Wdh. je Seite");
  });
});

describe("velocityLoss", () => {
  it("is the drop from fastest to last rep", () => {
    expect(velocityLoss(0.6, 0.48)).toBe(20);
    expect(velocityLoss(0.6, null)).toBeNull();
  });
});

describe("load-velocity profile", () => {
  // v = 1.5 - 0.01 × load
  const points = [40, 60, 80, 100].map((load) => ({ load, velocity: 1.5 - 0.01 * load }));

  it("fits the line", () => {
    const fit = fitLoadVelocity(points)!;
    expect(fit.slope).toBeCloseTo(-0.01);
    expect(fit.intercept).toBeCloseTo(1.5);
    expect(fit.r2).toBeCloseTo(1);
    expect(loadAt(fit, 0.5)).toBeCloseTo(100);
  });

  it("needs enough different loads and a falling line", () => {
    expect(fitLoadVelocity(points.slice(0, 2))).toBeNull();
    expect(fitLoadVelocity([{ load: 50, velocity: 1 }, { load: 50, velocity: 0.9 }, { load: 50, velocity: 0.95 }])).toBeNull();
    expect(fitLoadVelocity([{ load: 40, velocity: 0.5 }, { load: 60, velocity: 0.7 }, { load: 80, velocity: 0.9 }])).toBeNull();
  });

  it("estimates 1RM at the MVT", () => {
    expect(estimateOneRmFromProfile(fitLoadVelocity(points)!, 0.3)).toBe(120);
  });

  it("measures readiness against the line", () => {
    expect(readiness(fitLoadVelocity(points)!, 100, 0.55)).toBe(10);
  });

  it("suggests a load for a target velocity, adjusted to today", () => {
    const fit = fitLoadVelocity(points)!;
    expect(suggestLoad(fit, 0.6)).toBe(90);
    // 10 kg "stronger" today: 100 kg moved at 0.6 m/s.
    expect(suggestLoad(fit, 0.6, { load: 100, velocity: 0.6 })).toBe(100);
  });

  it("has sensible MVT defaults", () => {
    expect(defaultMvt("Kniebeuge")).toBe(0.3);
    expect(defaultMvt("Bankdrücken")).toBe(0.17);
    expect(defaultMvt("Rumänisches Kreuzheben")).toBe(0.3);
  });
});
