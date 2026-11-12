import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE, availability, breakAfterIndex, buildPeriods, normaliseSchedule, toMin } from "@/lib/schedule";

describe("school day schedule", () => {
  const s = DEFAULT_SCHEDULE;
  const ps = buildPeriods(s);

  it("makes 30-minute periods from 08:00 with a break after period 4", () => {
    expect(ps).toHaveLength(12);
    expect(ps[0].label).toBe("08:00 – 08:30");
    expect(ps[3].label).toBe("09:30 – 10:00");
    expect(ps[4].label).toBe("10:30 – 11:00");
    expect(breakAfterIndex(ps, 3)).toBe(30);
    expect(breakAfterIndex(ps, 0)).toBe(0);
    expect(ps[11].end).toBe(toMin("14:30"));
  });
  it("Friday closes at 1pm and has no lessons in periods 1 and 2", () => {
    expect(availability(s, ps, 4, 1)).toEqual({ open: false, reason: "No lesson" });
    expect(availability(s, ps, 4, 2)).toEqual({ open: false, reason: "No lesson" });
    expect(availability(s, ps, 4, 3).open).toBe(true);
    expect(availability(s, ps, 4, 9).open).toBe(true);   // ends 13:00
    expect(availability(s, ps, 4, 10)).toEqual({ open: false, reason: "Closed" });
  });
  it("Monday to Thursday use the normal day", () => {
    for (const d of [0, 1, 2, 3]) { expect(availability(s, ps, d, 1).open).toBe(true); expect(availability(s, ps, d, 12).open).toBe(true); }
  });
  it("the admin can change the period length and the day follows", () => {
    const c = normaliseSchedule({ ...s, periodMinutes: 40, count: 8, breaks: [{ after: 3, minutes: 20 }], close: "14:00" });
    const p = buildPeriods(c);
    expect(p[0].label).toBe("08:00 – 08:40");
    expect(p[3].start).toBe(toMin("10:20"));
    expect(availability(c, p, 0, 8).open).toBe(true);
  });
  it("bad values fall back safely", () => {
    const c = normaliseSchedule({ start: "nope", periodMinutes: 2, count: 99 });
    expect(c.start).toBe("08:00");
    expect(c.periodMinutes).toBeGreaterThanOrEqual(10);
    expect(c.count).toBeLessThanOrEqual(20);
  });
});
