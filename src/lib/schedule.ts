// The school day. Each group of weekdays (Monday to Thursday, Friday, ...) has its own list of periods and breaks with exact times.
// Set by the admin in Settings > Timetable & documents. Periods are numbered in order; breaks sit between them.

export type Row = { kind: "period" | "break"; label: string; start: string; end: string }; // "HH:MM"
export type Group = { name: string; days: number[]; close: string; noLesson: number[]; rows: Row[] }; // days: 0 = Monday ... 4 = Friday
export type Schedule = { groups: Group[] };

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const toMin = (hm: string): number => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
export const toHm = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const P = (start: string, end: string): Row => ({ kind: "period", label: "", start, end });
const B = (label: string, start: string, end: string): Row => ({ kind: "break", label, start, end });

/** Monday to Thursday: 30-minute periods, short break 10:00-10:05, long break 11:00-11:35, then periods 6-8 share 11:35-14:00 equally.
 *  Friday: 8:00 to 13:00. 30-minute periods, a long break, then 25-minute periods ending exactly at 13:00; no lessons in periods 1 and 2. Short break 5 minutes. */
export const DEFAULT_SCHEDULE: Schedule = {
  groups: [
    {
      name: "Monday to Thursday", days: [0, 1, 2, 3], close: "14:00", noLesson: [],
      rows: [P("08:00", "08:30"), P("08:30", "09:00"), P("09:00", "09:30"), P("09:30", "10:00"), B("Short break", "10:00", "10:05"),
        P("10:05", "11:00"), B("Long break", "11:00", "11:35"), P("11:35", "12:23"), P("12:23", "13:11"), P("13:11", "14:00")],
    },
    {
      name: "Friday", days: [4], close: "13:00", noLesson: [1, 2],
      rows: [P("08:00", "08:30"), P("08:30", "09:00"), P("09:00", "09:30"), P("09:30", "10:00"), B("Short break", "10:00", "10:05"),
        P("10:05", "10:35"), B("Long break", "10:35", "11:20"), P("11:20", "11:45"), P("11:45", "12:10"), P("12:10", "12:35"), P("12:35", "13:00")],
    },
  ],
};

export function normaliseSchedule(raw: unknown): Schedule {
  const r = raw as Partial<Schedule> | null;
  if (!r || !Array.isArray(r.groups) || r.groups.length === 0) return DEFAULT_SCHEDULE;
  const groups: Group[] = [];
  for (const g of r.groups) {
    if (!g || !Array.isArray(g.rows)) continue;
    const rows = g.rows
      .map((x): Row => ({ kind: x.kind === "break" ? "break" : "period", label: String(x.label ?? "").slice(0, 30), start: String(x.start), end: String(x.end) }))
      .filter((x) => Number.isFinite(toMin(x.start)) && Number.isFinite(toMin(x.end)) && toMin(x.end) > toMin(x.start))
      .sort((a, b) => toMin(a.start) - toMin(b.start));
    if (rows.length === 0) continue;
    const days = [...new Set((Array.isArray(g.days) ? g.days : []).map(Number).filter((d) => d >= 0 && d <= 4))];
    groups.push({
      name: String(g.name ?? "Days").slice(0, 40) || "Days", days,
      close: Number.isFinite(toMin(String(g.close))) ? String(g.close) : rows[rows.length - 1].end,
      noLesson: [...new Set((Array.isArray(g.noLesson) ? g.noLesson : []).map(Number).filter((n) => n >= 1 && n <= 30))].sort((a, b) => a - b),
      rows,
    });
  }
  return groups.length ? { groups } : DEFAULT_SCHEDULE;
}

/** Why a set of rows cannot be saved (overlap), or null when fine. */
export function scheduleProblem(rows: Row[]): string | null {
  const s = [...rows].sort((a, b) => toMin(a.start) - toMin(b.start));
  for (let i = 1; i < s.length; i++) if (toMin(s[i].start) < toMin(s[i - 1].end)) return `${s[i].start} overlaps ${s[i - 1].start}–${s[i - 1].end}.`;
  return null;
}

export const groupOf = (s: Schedule, dow: number): Group | null => s.groups.find((g) => g.days.includes(dow)) ?? null;

export type Period = { n: number; start: number; end: number; label: string };
export type BreakRow = { afterN: number; start: number; end: number; label: string };
export type Timeline = { periods: Period[]; breaks: BreakRow[]; close: string; noLesson: number[] };

/** Periods and breaks of one weekday, with periods numbered from 1 in order. */
export function timeline(s: Schedule, dow: number): Timeline {
  const g = groupOf(s, dow);
  const out: Timeline = { periods: [], breaks: [], close: g?.close ?? "", noLesson: g?.noLesson ?? [] };
  if (!g) return out;
  let n = 0;
  for (const r of g.rows) {
    const start = toMin(r.start), end = toMin(r.end);
    if (r.kind === "period") { n++; out.periods.push({ n, start, end, label: `${r.start} – ${r.end}` }); }
    else out.breaks.push({ afterN: n, start, end, label: r.label || "Break" });
  }
  return out;
}

export const maxPeriods = (s: Schedule): number => Math.max(0, ...[0, 1, 2, 3, 4].map((d) => timeline(s, d).periods.length));

export type Availability = { open: boolean; reason?: "No lesson" | "Closed" };

/** Can a lesson sit in period `n` on weekday `dow`? Only if that day has such a period and it is not marked "no lesson". */
export function availability(s: Schedule, dow: number, n: number): Availability {
  const t = timeline(s, dow);
  if (!t.periods.some((p) => p.n === n)) return { open: false, reason: "Closed" };
  if (t.noLesson.includes(n)) return { open: false, reason: "No lesson" };
  return { open: true };
}

export const periodAt = (s: Schedule, dow: number, n: number): Period | null => timeline(s, dow).periods.find((p) => p.n === n) ?? null;
