// Pure academic-calculation logic. No I/O so it can be unit tested.

export type Weights = { assignment: number; ca: number; exam: number };
export const DEFAULT_WEIGHTS: Weights = { assignment: 10, ca: 30, exam: 60 };

export type GradeBand = { grade: string; min: number; max: number; remark: string; tone: string };
export const DEFAULT_GRADES: GradeBand[] = [
  { grade: "A", min: 70, max: 100, remark: "Excellent", tone: "green" },
  { grade: "B", min: 60, max: 69, remark: "Very Good", tone: "blue" },
  { grade: "C", min: 50, max: 59, remark: "Good", tone: "teal" },
  { grade: "D", min: 45, max: 49, remark: "Fair", tone: "amber" },
  { grade: "E", min: 40, max: 44, remark: "Pass", tone: "orange" },
  { grade: "F", min: 0, max: 39, remark: "Fail", tone: "red" },
];

export const DEFAULT_COMMENTS: Record<string, string> = {
  A: "Excellent performance. Continue to maintain this standard.",
  B: "Very good performance. Further effort can produce excellent results.",
  C: "Good performance. More consistent study is recommended.",
  D: "Fair performance. Additional revision and practice are required.",
  E: "Performance requires improvement. Greater academic attention is recommended.",
  F: "Performance is below the expected standard. Intensive revision, support and closer monitoring are recommended.",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Normalise a raw score to a weighted contribution. 8/10 with weight 10 -> 8; 80% with weight 30 -> 24. */
export function normalise(raw: number, rawMax: number, weight: number): number {
  if (!Number.isFinite(raw) || !Number.isFinite(rawMax) || rawMax <= 0 || weight <= 0) return 0;
  const pct = Math.min(Math.max(raw / rawMax, 0), 1);
  return round2(pct * weight);
}

export function totalScore(parts: { assignment?: number | null; ca?: number | null; exam?: number | null }): number {
  return round2((parts.assignment ?? 0) + (parts.ca ?? 0) + (parts.exam ?? 0));
}

export function gradeFor(score: number, bands: GradeBand[] = DEFAULT_GRADES): GradeBand {
  const s = Math.round(score);
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => s >= b.min && s <= Math.max(b.max, b.min)) ?? sorted.find((b) => s >= b.min) ?? sorted[sorted.length - 1];
}

export function commentFor(grade: string, comments: Record<string, string> = DEFAULT_COMMENTS): string {
  return comments[grade] ?? "";
}

export function weightsValid(w: Weights): boolean {
  return [w.assignment, w.ca, w.exam].every((n) => Number.isFinite(n) && n >= 0) && w.assignment + w.ca + w.exam === 100;
}

/** Competition ranking ("1224"): equal totals share a position. */
export function rankPositions(totals: { id: string; total: number }[]): Map<string, number> {
  const sorted = [...totals].sort((a, b) => b.total - a.total);
  const out = new Map<string, number>();
  let last = Infinity;
  let pos = 0;
  sorted.forEach((t, i) => {
    if (t.total !== last) {
      pos = i + 1;
      last = t.total;
    }
    out.set(t.id, pos);
  });
  return out;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
