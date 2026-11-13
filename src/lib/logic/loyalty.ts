/** Loyalty ladder and points rules. Study and school work are worth far more than games. */
export type Tier = { name: string; min: number; family: string; rank: number };

const T = (name: string, min: number, family: string, rank: number): Tier => ({ name, min, family, rank });
export const TIERS: Tier[] = [
  T("New", 0, "new", 0), T("Amateur", 100, "new", 1),
  T("Silver", 300, "silver", 1), T("Silver Ultra", 600, "silver", 2),
  T("New Bronze", 1000, "bronze", 0), T("Bronze", 1500, "bronze", 1), T("Bronze Ultra", 2200, "bronze", 2),
  T("New Gold", 3000, "gold", 0), T("Gold", 4000, "gold", 1), T("Gold Ultra", 5200, "gold", 2),
  T("New Premium", 6600, "premium", 0), T("Premium", 8200, "premium", 1), T("Premium Ultra", 10000, "premium", 2),
  T("Platinum", 12500, "platinum", 1), T("New Platinum", 15500, "platinum", 0), T("Platinum Ultra", 19000, "platinum", 2),
  T("Emeritus", 24000, "emeritus", 1), T("Grand Emeritus", 30000, "emeritus", 2),
];

export const FAMILY_COLOURS: Record<string, [string, string, string]> = {
  new: ["#9fb4c7", "#5b7389", "#e8f0f7"], silver: ["#e5e7eb", "#9ca3af", "#f9fafb"], bronze: ["#e0a36b", "#9a5b27", "#fde8d0"],
  gold: ["#fde047", "#ca8a04", "#fef9c3"], premium: ["#c084fc", "#6d28d9", "#f3e8ff"], platinum: ["#67e8f9", "#0e7490", "#ecfeff"],
  emeritus: ["#f87171", "#991b1b", "#fee2e2"],
};

export function tierIndex(points: number): number {
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (points >= TIERS[k].min) i = k;
  return i;
}
export function progress(points: number) {
  const i = tierIndex(points), cur = TIERS[i], next = TIERS[i + 1] ?? null;
  const pct = next ? Math.min(100, Math.round(((points - cur.min) / (next.min - cur.min)) * 100)) : 100;
  return { index: i, tier: cur, next, pct, toNext: next ? next.min - points : 0 };
}

/** Points. Study and classwork/assignments are weighted well above games, and games have a daily cap. */
export const POINTS = {
  perCorrectWork: 10,   // every correct answer in an assignment, classwork, CA, exam or mock
  topicStudied: 25,     // finishing a study topic
  perCorrectGame: { easy: 2, medium: 4, hard: 6 } as Record<string, number>,
  perfectGameBonus: 5,
  gameDailyCap: 60,
};

export function gamePoints(level: string, correct: number, total: number, alreadyToday: number): number {
  const raw = correct * (POINTS.perCorrectGame[level] ?? 2) + (total > 0 && correct === total ? POINTS.perfectGameBonus : 0);
  return Math.max(0, Math.min(raw, POINTS.gameDailyCap - alreadyToday));
}
