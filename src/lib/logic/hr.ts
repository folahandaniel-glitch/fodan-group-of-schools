/** HR rules that need no database: working days for leave, appraisal scoring and recruitment stages. */
export const DEFAULT_LEAVE_TYPES: { name: string; days: number; paid: boolean }[] = [
  { name: "Annual leave", days: 20, paid: true }, { name: "Sick leave", days: 10, paid: true }, { name: "Maternity leave", days: 90, paid: true },
  { name: "Paternity leave", days: 10, paid: true }, { name: "Compassionate leave", days: 5, paid: true }, { name: "Study / exam leave", days: 5, paid: true }, { name: "Unpaid leave", days: 30, paid: false },
];

/** Counts Monday to Friday days from..to (inclusive, ISO dates), skipping public holidays given as ISO dates. */
export function workingDays(from: string, to: string, holidays: string[] = []): number {
  const a = new Date(from + "T00:00:00Z"), b = new Date(to + "T00:00:00Z");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  const hs = new Set(holidays);
  let n = 0;
  for (let d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6 && !hs.has(d.toISOString().slice(0, 10))) n++;
  }
  return n;
}

export const CRITERIA: { key: string; label: string }[] = [
  { key: "quality", label: "Quality of work" }, { key: "knowledge", label: "Job knowledge" }, { key: "punctuality", label: "Punctuality & attendance" },
  { key: "teamwork", label: "Teamwork & communication" }, { key: "initiative", label: "Initiative & problem solving" }, { key: "conduct", label: "Conduct & professionalism" },
];
export const RATING_LABEL = ["", "Needs improvement", "Below expectations", "Meets expectations", "Exceeds expectations", "Outstanding"];

/** Average of the 1-5 scores that were filled in, to one decimal. 0 when none. */
export function overallScore(scores: Record<string, number>): number {
  const v = CRITERIA.map((c) => Number(scores[c.key])).filter((n) => n >= 1 && n <= 5);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : 0;
}
export const ratingWord = (n: number) => RATING_LABEL[Math.min(5, Math.max(0, Math.round(n)))] || "Not rated";

export const RECRUIT_STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;
export const STAGE_NAME: Record<string, string> = { applied: "Applied", screening: "Screening", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Not selected" };
export const nextStage = (s: string) => { const i = RECRUIT_STAGES.indexOf(s as never); return i >= 0 && i < 4 ? RECRUIT_STAGES[i + 1] : null; };

/** Years and months of service for an employment date, as text. */
export function service(from: string | Date | null | undefined, now = new Date()): string {
  if (!from) return "-";
  const a = new Date(from); if (Number.isNaN(a.getTime())) return "-";
  let m = (now.getFullYear() - a.getFullYear()) * 12 + (now.getMonth() - a.getMonth()); if (now.getDate() < a.getDate()) m--;
  if (m < 0) return "-";
  const y = Math.floor(m / 12), r = m % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", r ? `${r} mo` : ""].filter(Boolean).join(" ") || "New";
}
