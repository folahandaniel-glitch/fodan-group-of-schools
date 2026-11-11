export const SHIFTS = ["Morning", "Afternoon", "Night", "Weekend duty", "Off"];
export const SHIFT_TONE: Record<string, string> = { Morning: "--color-gold-2", Afternoon: "--color-royal", Night: "--color-strong-2", "Weekend duty": "--color-warn", Off: "--color-muted" };

/** Monday (YYYY-MM-DD) of the week containing `day`. */
export function mondayOf(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
