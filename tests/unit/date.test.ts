import { describe, it, expect } from "vitest";
import {
  moveStartToAppDate,
  utcISOToAppTimeString,
  formatDateShort,
  appWallTimeToUTCISOString,
  utcISOToAppDateString,
  getMonthGridDays,
  weeklyOccurrences,
  getWeekStart,
  getWeekDays,
  getISOWeekNumber,
  shiftDateISO,
  shiftMonthStr,
} from "@/lib/date";

describe("formatDateShort", () => {
  it("formats an ISO date as dd.mm.yyyy (German convention)", () => {
    expect(formatDateShort("2026-08-24")).toBe("24.08.2026");
  });
});

describe("shiftDateISO", () => {
  it("shifts forward across a month boundary", () => {
    expect(shiftDateISO("2026-08-30", 3)).toBe("2026-09-02");
  });
  it("shifts backward across a year boundary", () => {
    expect(shiftDateISO("2026-01-02", -5)).toBe("2025-12-28");
  });
});

describe("appWallTimeToUTCISOString / utcISOToAppDateString", () => {
  // Europe/Berlin is UTC+2 in summer (CEST) and UTC+1 in winter (CET) — the
  // whole point of these helpers is getting this right without drifting a
  // training's displayed date across the DST boundary.
  it("converts a summer (CEST, UTC+2) wall-clock time correctly", () => {
    const iso = appWallTimeToUTCISOString("2026-08-24", "17:30");
    expect(iso).toBe("2026-08-24T15:30:00.000Z");
  });

  it("converts a winter (CET, UTC+1) wall-clock time correctly", () => {
    const iso = appWallTimeToUTCISOString("2026-01-15", "17:30");
    expect(iso).toBe("2026-01-15T16:30:00.000Z");
  });

  it("round-trips back to the same app-timezone calendar date", () => {
    const iso = appWallTimeToUTCISOString("2026-08-24", "23:30");
    expect(utcISOToAppDateString(iso)).toBe("2026-08-24");
  });

  it("does not let a late-evening event slip to the next UTC day", () => {
    // 23:30 Berlin time in summer is 21:30 UTC — still the same calendar day,
    // but a naive `.slice(0, 10)` on a *stored* UTC instant near midnight is
    // exactly the class of bug appWallTimeToUTCISOString/utcISOToAppDateString
    // exist to prevent.
    const iso = appWallTimeToUTCISOString("2026-08-24", "23:30");
    expect(iso.slice(0, 10)).toBe("2026-08-24");
  });
});

describe("getMonthGridDays", () => {
  it("starts on a Monday and ends on a Sunday", () => {
    const days = getMonthGridDays("2026-08");
    expect(days[0]).toBe("2026-07-27"); // Monday before Aug 1, 2026 (a Saturday)
    expect(days[days.length - 1]).toBe("2026-09-06"); // Sunday after Aug 31, 2026 (a Monday)
  });

  it("covers every day of the month itself", () => {
    const days = getMonthGridDays("2026-02");
    expect(days).toContain("2026-02-01");
    expect(days).toContain("2026-02-28");
  });

  it("returns a whole number of 7-day weeks", () => {
    const days = getMonthGridDays("2026-08");
    expect(days.length % 7).toBe(0);
  });
});

describe("weeklyOccurrences", () => {
  it("includes the start date and repeats on the same weekday", () => {
    const dates = weeklyOccurrences("2026-08-03", "2026-08-24");
    expect(dates).toEqual(["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"]);
  });

  it("returns just the start date when until is before the next occurrence", () => {
    expect(weeklyOccurrences("2026-08-03", "2026-08-03")).toEqual(["2026-08-03"]);
  });

  it("never runs away past the 104-week guard", () => {
    const dates = weeklyOccurrences("2020-01-06", "2030-01-01");
    expect(dates.length).toBeLessThanOrEqual(104);
  });
});

describe("getWeekStart / getWeekDays", () => {
  it("finds Monday for a date mid-week", () => {
    expect(getWeekStart("2026-08-26")).toBe("2026-08-24"); // Wed -> Mon
  });
  it("finds Monday for a Sunday (end of the ISO week)", () => {
    expect(getWeekStart("2026-08-30")).toBe("2026-08-24");
  });
  it("returns 7 consecutive days starting Monday", () => {
    const days = getWeekDays("2026-08-26");
    expect(days).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
    ]);
  });
});

describe("getISOWeekNumber", () => {
  it("matches the known ISO week for a fixed date", () => {
    // 2026-08-26 is a Wednesday in ISO week 35.
    expect(getISOWeekNumber("2026-08-26")).toBe(35);
  });
  it("handles the year-boundary edge case correctly", () => {
    // Jan 1, 2027 is a Friday, still part of ISO week 53 of 2026.
    expect(getISOWeekNumber("2027-01-01")).toBe(53);
  });
});

describe("shiftMonthStr", () => {
  it("rolls over into the next year", () => {
    expect(shiftMonthStr("2026-12", 1)).toBe("2027-01");
  });
  it("rolls back into the previous year", () => {
    expect(shiftMonthStr("2026-01", -1)).toBe("2025-12");
  });
});

describe("moveStartToAppDate", () => {
  it("keeps the Berlin wall-clock time across the end of DST", () => {
    // 20.10.2026 18:00 Berlin (CEST, UTC+2) → 27.10.2026 18:00 Berlin (CET, UTC+1)
    const moved = moveStartToAppDate("2026-10-20T16:00:00.000Z", false, "2026-10-27");
    expect(moved).toBe("2026-10-27T17:00:00.000Z");
    expect(utcISOToAppTimeString(moved)).toBe("18:00");
  });

  it("keeps a just-after-midnight event on the target day", () => {
    // 00:30 Berlin on 14.10. is stored as 22:30Z on 13.10.
    const moved = moveStartToAppDate("2026-10-13T22:30:00.000Z", false, "2026-10-21");
    expect(utcISOToAppDateString(moved)).toBe("2026-10-21");
  });

  it("leaves all-day events at UTC midnight", () => {
    expect(moveStartToAppDate("2026-10-20T00:00:00Z", true, "2026-10-27")).toBe("2026-10-27T00:00:00Z");
  });
});
