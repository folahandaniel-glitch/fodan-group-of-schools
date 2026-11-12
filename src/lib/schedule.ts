// The school day: when it starts, how long a period is, breaks, and each weekday's closing time. Set by the admin in Settings > Timetable.

export type Schedule = {
  start: string;            // "08:00"
  periodMinutes: number;    // length of every period
  count: number;            // number of periods in a full day
  breaks: { after: number; minutes: number }[];
  close: string;            // normal closing time, Monday to Thursday
  days: Record<number, { close?: string; noLesson?: number[] }>; // 0 = Monday ... 4 = Friday
};

/** Friday closes at 1pm and has no lessons in periods 1 and 2. */
export const DEFAULT_SCHEDULE: Schedule = {
  start: "08:00", periodMinutes: 30, count: 12, breaks: [{ after: 4, minutes: 30 }], close: "14:30",
  days: { 4: { close: "13:00", noLesson: [1, 2] } },
};

export type Period = { n: number; start: number; end: number; label: string };
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const toMin = (hm: string): number => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
export const toHm = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function normaliseSchedule(raw: unknown): Schedule {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Schedule>;
  const d = DEFAULT_SCHEDULE;
  const ok = (v: unknown, fb: string) => (typeof v === "string" && Number.isFinite(toMin(v)) ? v : fb);
  return {
    start: ok(r.start, d.start),
    periodMinutes: Math.min(Math.max(Math.round(Number(r.periodMinutes)) || d.periodMinutes, 10), 120),
    count: Math.min(Math.max(Math.round(Number(r.count)) || d.count, 1), 20),
    breaks: Array.isArray(r.breaks) ? r.breaks.map((b) => ({ after: Math.round(Number(b.after)), minutes: Math.round(Number(b.minutes)) })).filter((b) => b.after >= 1 && b.minutes >= 5 && b.minutes <= 120) : d.breaks,
    close: ok(r.close, d.close),
    days: r.days && typeof r.days === "object" ? r.days : d.days,
  };
}

export function buildPeriods(s: Schedule): Period[] {
  const out: Period[] = [];
  let t = toMin(s.start);
  for (let n = 1; n <= s.count; n++) {
    out.push({ n, start: t, end: t + s.periodMinutes, label: `${toHm(t)} – ${toHm(t + s.periodMinutes)}` });
    t += s.periodMinutes + (s.breaks.find((b) => b.after === n)?.minutes ?? 0);
  }
  return out;
}

/** Minutes of break after period index i (0-based) when there is one. */
export function breakAfterIndex(periods: Period[], i: number): number {
  const a = periods[i], b = periods[i + 1];
  return a && b && b.start - a.end >= 5 ? b.start - a.end : 0;
}

export type Availability = { open: boolean; reason?: "No lesson" | "Closed" };

/** Can a lesson be placed in period `n` on weekday `dow`? Not after that day's closing time, and not in the day's no-lesson periods. */
export function availability(s: Schedule, periods: Period[], dow: number, n: number): Availability {
  const p = periods.find((x) => x.n === n);
  if (!p) return { open: false, reason: "Closed" };
  const day = s.days[dow] ?? {};
  if ((day.noLesson ?? []).includes(n)) return { open: false, reason: "No lesson" };
  const close = toMin(day.close ?? s.close);
  if (Number.isFinite(close) && p.end > close) return { open: false, reason: "Closed" };
  return { open: true };
}
