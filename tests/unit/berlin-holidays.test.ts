import { describe, it, expect } from "vitest";
import { getBerlinPublicHolidays, getBerlinCalendarMark } from "@/lib/berlin-holidays";

describe("getBerlinPublicHolidays", () => {
  it("computes the correct Easter-relative holidays for 2026", () => {
    // Easter Sunday 2026 is April 5 — verified against an independent source
    // (kalenderpedia.de), since this exercises the Gauss algorithm itself.
    const holidays = getBerlinPublicHolidays(2026);
    expect(holidays["2026-04-03"]).toBe("Karfreitag");
    expect(holidays["2026-04-06"]).toBe("Ostermontag");
    expect(holidays["2026-05-14"]).toBe("Christi Himmelfahrt");
    expect(holidays["2026-05-25"]).toBe("Pfingstmontag");
  });

  it("includes the fixed-date holidays", () => {
    const holidays = getBerlinPublicHolidays(2026);
    expect(holidays["2026-01-01"]).toBe("Neujahr");
    expect(holidays["2026-10-03"]).toBe("Tag der Deutschen Einheit");
    expect(holidays["2026-12-25"]).toBe("1. Weihnachtsfeiertag");
  });

  it("only includes Frauentag from 2019 onward", () => {
    expect(getBerlinPublicHolidays(2018)["2018-03-08"]).toBeUndefined();
    expect(getBerlinPublicHolidays(2019)["2019-03-08"]).toBe("Internationaler Frauentag");
  });
});

describe("getBerlinCalendarMark", () => {
  it("marks a public holiday", () => {
    expect(getBerlinCalendarMark("2026-01-01")).toEqual({ type: "feiertag", label: "Neujahr" });
  });

  it("marks a day inside a school holiday range", () => {
    expect(getBerlinCalendarMark("2026-08-01")).toEqual({ type: "ferien", label: "Sommerferien" });
  });

  it("returns null for an ordinary working day", () => {
    expect(getBerlinCalendarMark("2026-08-25")).toBeNull();
  });

  it("prefers the Feiertag label when a holiday falls inside a Ferien range", () => {
    // 2026-01-01 (Neujahr) falls inside the 2025/26 Weihnachtsferien
    // (2025-12-22 to 2026-01-02) — both are true for this date, but only the
    // Feiertag label should win.
    expect(getBerlinCalendarMark("2026-01-01")).toEqual({ type: "feiertag", label: "Neujahr" });
  });
});
