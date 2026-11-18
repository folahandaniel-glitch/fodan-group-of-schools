/** Exam timetable rules that need no database: working days, clash-free slot generation and clash checks. */
export type Slot = { classId: string; subjectId: string; day: string; start: string; minutes: number };
export type GenClass = { id: string; level: number; subjects: { id: string; name: string }[] };

const CORE = /^(mathematics|english)/i;
export const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
export const addMin = (t: string, n: number) => { const x = toMin(t) + n; return `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };

/** Monday to Friday dates from start to end (ISO), skipping the given holidays. */
export function examDays(start: string, end: string, holidays: string[] = []): string[] {
  const a = new Date(start + "T00:00:00Z"), b = new Date(end + "T00:00:00Z"), hs = new Set(holidays), out: string[] = [];
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return out;
  for (let d = new Date(a); d <= b && out.length < 120; d.setUTCDate(d.getUTCDate() + 1)) {
    const w = d.getUTCDay(), iso = d.toISOString().slice(0, 10);
    if (w !== 0 && w !== 6 && !hs.has(iso)) out.push(iso);
  }
  return out;
}

/** Two papers for the same class overlap in time. */
export const overlaps = (a: { day: string; start: string; minutes: number }, b: { day: string; start: string; minutes: number }) =>
  a.day === b.day && toMin(a.start) < toMin(b.start) + b.minutes && toMin(b.start) < toMin(a.start) + a.minutes;

export function findClash(slots: Slot[], cand: Slot, ignoreIndex = -1): Slot | null {
  return slots.find((s, i) => i !== ignoreIndex && s.classId === cand.classId && overlaps(s, cand)) ?? null;
}

/**
 * Builds a clash-free timetable. Classes of the same level (arms) sit the same paper at the same time.
 * Mathematics and English come first; the rest are spread evenly over the days. Returns slots and anything that did not fit.
 */
export function generateExamTimetable(o: { days: string[]; sessions: string[]; minutes: number; classes: GenClass[]; minutesFor?: (subjectName: string) => number }): { slots: Slot[]; problems: string[] } {
  const slots: Slot[] = [], problems: string[] = [];
  const sessions = [...o.sessions].sort();
  const cells = o.days.flatMap((d) => sessions.map((s) => ({ day: d, start: s })));
  const byLevel = new Map<number, GenClass[]>();
  for (const c of o.classes) byLevel.set(c.level, [...(byLevel.get(c.level) ?? []), c]);
  for (const [level, group] of byLevel) {
    const subj = new Map<string, string>();
    for (const c of group) for (const s of c.subjects) if (!subj.has(s.id)) subj.set(s.id, s.name);
    const order = [...subj.entries()].sort((a, b) => Number(CORE.test(b[1])) - Number(CORE.test(a[1])) || a[1].localeCompare(b[1]));
    if (order.length > cells.length) problems.push(`Level ${level}: ${order.length} subjects but only ${cells.length} sessions. Add days or sessions.`);
    // Spread across days: step through the cells so papers do not bunch up when there is room.
    const step = order.length > 0 && cells.length >= order.length ? cells.length / order.length : 1;
    order.slice(0, cells.length).forEach(([sid, name], k) => {
      const idx = Math.min(cells.length - 1, Math.floor(k * step));
      const free = cells.slice(idx).concat(cells.slice(0, idx)).find((c) => !slots.some((s) => s.classId === group[0].id && s.day === c.day && s.start === c.start));
      if (!free) return;
      const minutes = o.minutesFor ? o.minutesFor(name) : o.minutes;
      for (const c of group) if (c.subjects.some((s) => s.id === sid)) slots.push({ classId: c.id, subjectId: sid, day: free.day, start: free.start, minutes });
    });
  }
  // Final proof: no class has two overlapping papers.
  slots.forEach((s, i) => { const c = findClash(slots, s, i); if (c && i > slots.indexOf(c)) problems.push("Clash found and left for manual fixing."); });
  return { slots, problems };
}
