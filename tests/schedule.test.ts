import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE, availability, maxPeriods, normaliseSchedule, periodAt, scheduleProblem, timeline, toMin } from "@/lib/schedule";

const s = DEFAULT_SCHEDULE;
const len = (dow: number, n: number) => { const p = periodAt(s, dow, n)!; return p.end - p.start; };

describe("Monday to Thursday", () => {
  const t = timeline(s, 1);
  it("has 30-minute periods 1-4, short break 10:00-10:05 and long break 11:00-11:35", () => {
    expect([1, 2, 3, 4].map((n) => len(1, n))).toEqual([30, 30, 30, 30]);
    expect(periodAt(s, 1, 4)!.label).toBe("09:30 – 10:00");
    expect(t.breaks.find((b) => b.label === "Short break")).toMatchObject({ start: toMin("10:00"), end: toMin("10:05"), afterN: 4 });
    expect(t.breaks.find((b) => b.label === "Long break")).toMatchObject({ start: toMin("11:00"), end: toMin("11:35"), afterN: 5 });
    expect(periodAt(s, 1, 5)!.label).toBe("10:05 – 11:00");
  });
  it("periods 6 to 8 share 11:35-14:00 equally (48, 48 and 49 minutes)", () => {
    expect(periodAt(s, 0, 6)!.start).toBe(toMin("11:35"));
    expect(periodAt(s, 0, 8)!.end).toBe(toMin("14:00"));
    expect([6, 7, 8].map((n) => len(0, n))).toEqual([48, 48, 49]);
    expect(timeline(s, 3).periods).toHaveLength(8);
  });
});

describe("Friday", () => {
  const t = timeline(s, 4);
  it("runs 08:00 to 13:00 with lessons in every period, including 1 and 2", () => {
    expect(t.periods[0].start).toBe(toMin("08:00"));
    expect(t.periods[t.periods.length - 1].end).toBe(toMin("13:00"));
    expect(availability(s, 4, 1).open).toBe(true);
    expect(availability(s, 4, 2).open).toBe(true);
    expect(availability(s, 4, 3).open).toBe(true);
  });
  it("30-minute periods before the long break, 25-minute periods after it, 5-minute short break", () => {
    const long = t.breaks.find((b) => b.label === "Long break")!;
    for (const p of t.periods) expect(p.end - p.start).toBe(p.start >= long.end ? 25 : 30);
    expect(t.breaks.find((b) => b.label === "Short break")).toMatchObject({ start: toMin("10:00"), end: toMin("10:05") });
  });
  it("has a period 9, which the other days do not", () => {
    expect(maxPeriods(s)).toBe(9);
    expect(availability(s, 0, 9)).toEqual({ open: false, reason: "Closed" });
    expect(availability(s, 4, 9).open).toBe(true);
  });
});

describe("admin edits", () => {
  it("accepts edited rows, sorts them and numbers periods in order", () => {
    const c = normaliseSchedule({ groups: [{ name: "All", days: [0, 1, 2, 3, 4], close: "12:00", noLesson: [], rows: [
      { kind: "period", start: "09:00", end: "09:45" }, { kind: "period", start: "08:00", end: "08:45" }, { kind: "break", label: "Break", start: "08:45", end: "09:00" }] }] });
    expect(periodAt(c, 2, 1)!.label).toBe("08:00 – 08:45");
    expect(periodAt(c, 2, 2)!.label).toBe("09:00 – 09:45");
    expect(timeline(c, 2).breaks[0].afterN).toBe(1);
  });
  it("detects overlapping rows", () => {
    expect(scheduleProblem([{ kind: "period", label: "", start: "08:00", end: "08:40" }, { kind: "period", label: "", start: "08:30", end: "09:10" }])).toMatch(/overlaps/);
    expect(scheduleProblem([{ kind: "period", label: "", start: "08:00", end: "08:30" }, { kind: "break", label: "B", start: "08:30", end: "08:35" }])).toBeNull();
  });
  it("falls back to the standard day for nonsense", () => {
    expect(normaliseSchedule({ groups: "x" })).toBe(DEFAULT_SCHEDULE);
    expect(normaliseSchedule(null)).toBe(DEFAULT_SCHEDULE);
    expect(normaliseSchedule({ groups: [{ name: "Bad", days: [0], rows: [{ kind: "period", start: "9", end: "x" }] }] })).toBe(DEFAULT_SCHEDULE);
  });
});
