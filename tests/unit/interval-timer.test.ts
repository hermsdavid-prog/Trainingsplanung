import { describe, expect, it } from "vitest";
import { buildPhases, defaultSelection, parseSeconds, toTimerItems, totalSeconds, type TimerItem } from "@/lib/interval-timer";

describe("parseSeconds", () => {
  it("reads the usual plan wordings", () => {
    expect(parseSeconds("0:30")).toBe(30);
    expect(parseSeconds("1:30")).toBe(90);
    expect(parseSeconds("0:20 je Seite")).toBe(20);
    expect(parseSeconds("15 Sek.")).toBe(15);
    expect(parseSeconds("30 Sekunden")).toBe(30);
    expect(parseSeconds("10s")).toBe(10);
    expect(parseSeconds("3 Min. aktive Pause (leichtes Joggen)")).toBe(180);
    expect(parseSeconds("1,5 min")).toBe(90);
    expect(parseSeconds("60-75 Sek.")).toBe(60);
  });
  it("leaves rep counts and empty values alone", () => {
    expect(parseSeconds("10 Wdh.")).toBeNull();
    expect(parseSeconds("12")).toBeNull();
    expect(parseSeconds("3 Sätze")).toBeNull();
    expect(parseSeconds("—")).toBeNull();
    expect(parseSeconds(null)).toBeNull();
  });
});

const row = (id: string, name: string, work: string, sets: string, rest: string | null, roundRest: string | null = null, section = "runden") => ({
  id,
  exercise_name: name,
  section,
  reps_or_duration: work,
  sets,
  rest_time: rest,
  round_rest: roundRest,
});

describe("toTimerItems", () => {
  it("keeps timed Runden and Cardio rows only", () => {
    const items = toTimerItems([
      row("a", "Zirkel 1: Ausfallschritte", "0:30", "3", "0:30"),
      row("b", "Zirkel 3: Pallof Press", "0:20 je Seite", "3", "0:20"),
      row("c", "Kniebeuge", "10 Wdh.", "3", "60 Sek.", null, "kraft"),
      row("d", "Technik", "10 Wdh.", "3", null),
      row("e", "EE: Pogo Jumps", "15 Sek.", "3", "15 Sek.", "3 Min. aktive Pause", "cardio"),
    ]);
    expect(items.map((i) => i.id)).toEqual(["a", "b", "e"]);
    expect(items[1]).toMatchObject({ workSec: 20, perSide: true, restSec: 20, rounds: 3 });
    expect(items[2]).toMatchObject({ roundRestSec: 180 });
    expect(defaultSelection(items)).toEqual(["a", "b"]);
  });
});

const item = (id: string, workSec: number, restSec: number, rounds = 3, perSide = false, roundRestSec = 0): TimerItem => ({
  id,
  name: id,
  workSec,
  perSide,
  restSec,
  rounds,
  roundRestSec,
  label: "",
});

describe("buildPhases", () => {
  it("runs a circuit station by station, per side back to back, no rest at the end", () => {
    const stations = [item("A", 30, 30), item("B", 20, 20, 3, true), item("C", 30, 30)];
    const phases = buildPhases(stations, "circuit", 10);
    expect(phases[0]).toMatchObject({ kind: "prepare", seconds: 10, name: "A" });
    expect(phases.slice(1, 6).map((p) => `${p.kind}:${p.name}${p.side ? ":" + p.side : ""}`)).toEqual([
      "work:A",
      "rest:Pause",
      "work:B:links",
      "work:B:rechts",
      "rest:Pause",
    ]);
    expect(phases[phases.length - 1]).toMatchObject({ kind: "work", name: "C", round: 3 });
    // 10 s prepare + 3 rounds × 3 min − the final 30 s rest.
    expect(totalSeconds(phases)).toBe(10 + 3 * 180 - 30);
  });

  it("uses the round rest after the last station of a round", () => {
    const ee = [item("Pogo", 15, 15, 3, false, 180), item("CMJ", 15, 15, 3, false, 180)];
    const phases = buildPhases(ee, "circuit", 10);
    const rests = phases.filter((p) => p.kind === "rest");
    expect(rests.map((p) => p.seconds)).toEqual([15, 180, 15, 180, 15]);
    expect(rests[1].roundRest).toBe(true);
  });

  it("runs each row's rounds before the next row in sequence mode", () => {
    const phases = buildPhases([item("T1", 90, 30, 2), item("T2", 60, 45, 2)], "sequence", 5);
    expect(phases.map((p) => `${p.kind}:${p.name}:${p.round}`)).toEqual([
      "prepare:T1:1",
      "work:T1:1",
      "rest:Pause:1",
      "work:T1:2",
      "rest:Pause:2",
      "work:T2:1",
      "rest:Pause:1",
      "work:T2:2",
    ]);
  });

  it("points every phase at the next work phase", () => {
    const phases = buildPhases([item("A", 30, 30, 1), item("B", 20, 0, 1, true)], "circuit", 10);
    expect(phases[0].next).toBeUndefined();
    expect(phases[1].next).toBe("B (links)");
    expect(phases[2].next).toBe("B (links)");
    expect(phases[3].next).toBe("B (rechts)");
    expect(phases[4].next).toBeUndefined();
  });
});
