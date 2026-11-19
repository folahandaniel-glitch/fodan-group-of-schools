import { getSetting } from "./settings";

export type ExamRules = { maxAttempts: number; lateEntryMin: number; defaultMinutes: number; standard: { classwork: number; assignment: number; mock: number; other: number } };
export const DEFAULT_RULES: ExamRules = { maxAttempts: 2, lateEntryMin: 15, defaultMinutes: 70, standard: { classwork: 10, assignment: 10, mock: 70, other: 70 } };

const n = (v: unknown, lo: number, hi: number, d: number) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x >= lo && x <= hi ? x : d; };
export function normaliseRules(raw: unknown): ExamRules {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ExamRules> & { standard?: Partial<ExamRules["standard"]> };
  const d = DEFAULT_RULES, s: Partial<ExamRules["standard"]> = r.standard ?? {};
  return { maxAttempts: n(r.maxAttempts, 1, 5, d.maxAttempts), lateEntryMin: n(r.lateEntryMin, 0, 120, d.lateEntryMin), defaultMinutes: n(r.defaultMinutes, 10, 300, d.defaultMinutes),
    standard: { classwork: n(s.classwork, 5, 240, d.standard.classwork), assignment: n(s.assignment, 5, 240, d.standard.assignment), mock: n(s.mock, 10, 300, d.standard.mock), other: n(s.other, 10, 300, d.standard.other) } };
}
export async function getRules(): Promise<ExamRules> { return normaliseRules(await getSetting("exam_rules")); }

/** Minutes for an assessment. CA and terminal exams follow the timetable slot when there is one; everything else uses the standard time. */
export function minutesFor(kind: string, rules: ExamRules, slotMinutes: number | null, own: number): number {
  if ((kind === "ca" || kind === "exam") && slotMinutes) return slotMinutes;
  if (kind === "ca" || kind === "exam") return rules.defaultMinutes;
  if (kind === "classwork") return rules.standard.classwork;
  if (kind === "assignment" || kind === "practice") return rules.standard.assignment;
  if (kind === "mock") return rules.standard.mock;
  return rules.standard.other;
}
