// Pure school-structure rules.

export type ClassLevel = { level: number; name: string; section: "Primary" | "Junior Secondary" | "Senior Secondary" };

export const CLASS_LEVELS: ClassLevel[] = [
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ level: n, name: `Basic ${n}`, section: "Primary" as const })),
  ...[1, 2, 3].map((n) => ({ level: 6 + n, name: `JSS ${n}`, section: "Junior Secondary" as const })),
  ...[1, 2, 3].map((n) => ({ level: 9 + n, name: `SSS ${n}`, section: "Senior Secondary" as const })),
];
export const MAX_LEVEL = 12;
export const DEFAULT_DEPARTMENTS = ["Science", "Commercial", "Arts"];

/** The level a student moves to on promotion; null means graduation. */
export function nextLevel(level: number): number | null {
  return level >= MAX_LEVEL ? null : level + 1;
}

export function needsDepartment(level: number): boolean {
  return level >= 10;
}

/** Default examination eligibility (Super Admin may override in settings). */
export const DEFAULT_EXAM_ELIGIBILITY: Record<string, number[]> = {
  common_entrance: [5, 6],
  bece: [8, 9],
  neco: [11, 12],
  waec: [11, 12],
  jamb: [11, 12],
  international: [5, 6, 8, 9, 11, 12],
};

export const MOCK_CATEGORIES: { key: string; label: string; blurb: string }[] = [
  { key: "common_entrance", label: "Common Entrance", blurb: "Entrance-style practice for Basic 5 and Basic 6." },
  { key: "bece", label: "BECE", blurb: "Junior secondary certificate preparation for JSS 2 and JSS 3." },
  { key: "neco", label: "NECO", blurb: "Senior secondary preparation for SSS 2 and SSS 3." },
  { key: "waec", label: "WAEC", blurb: "WASSCE-style preparation for SSS 2 and SSS 3." },
  { key: "jamb", label: "JAMB", blurb: "UTME-style computer-based practice for SSS 2 and SSS 3." },
  { key: "international", label: "International", blurb: "Configurable international-style preparation and entrance assessments." },
];

export const MOCK_TYPES = [
  "Full mock", "Subject mock", "Topic mock", "Timed mock", "Practice mock",
  "Revision mock", "Diagnostic test", "Entrance mock", "Competitive mock", "Examination simulation",
];

export function eligible(category: string, level: number, table = DEFAULT_EXAM_ELIGIBILITY): boolean {
  return (table[category] ?? []).includes(level);
}

export type Seniority = { minYears: number; minPositionRank: number; requireDegree: boolean };
export function isSenior(
  s: { years: number; qualification: string; positionRank: number; adminResponsibility?: boolean },
  rule: Seniority = { minYears: 5, minPositionRank: 0, requireDegree: false },
): boolean {
  if (s.adminResponsibility) return true;
  const degree = /(b\.?sc|b\.?a|b\.?ed|bachelor|hnd|m\.?sc|m\.?ed|m\.?a|ph\.?d|pgde|degree)/i.test(s.qualification);
  if (rule.requireDegree && !degree) return false;
  return s.years >= rule.minYears && s.positionRank >= rule.minPositionRank;
}
