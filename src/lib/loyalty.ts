import { sql } from "@/lib/db";
import { POINTS, progress } from "@/lib/logic/loyalty";

/** Adds points once per (user, source, ref). Safe to call again for the same thing. Never throws, so it can never break a submission. */
export async function award(schoolId: string, userId: string, source: "study" | "work" | "game", ref: string, points: number, detail: string): Promise<void> {
  if (!userId || points <= 0) return;
  try {
    await sql`INSERT INTO reward_events (school_id, user_id, source, ref, points, detail) VALUES (${schoolId}, ${userId}, ${source}, ${ref}, ${Math.round(points)}, ${detail.slice(0, 160)}) ON CONFLICT (user_id, source, ref) DO NOTHING`;
  } catch { /* rewards are a bonus, never a blocker */ }
}
export const workPoints = (correct: number) => correct * POINTS.perCorrectWork;

export async function totals(userId: string) {
  const rows = await sql`SELECT source, COALESCE(sum(points),0)::int AS pts, count(*)::int AS n FROM reward_events WHERE user_id = ${userId} GROUP BY source`;
  const by: Record<string, number> = { study: 0, work: 0, game: 0 };
  for (const r of rows) by[r.source as string] = r.pts as number;
  const total = by.study + by.work + by.game;
  return { total, by, ...progress(total) };
}
export async function gameToday(userId: string): Promise<number> {
  const [r] = await sql`SELECT COALESCE(sum(points),0)::int AS p FROM reward_events WHERE user_id = ${userId} AND source = 'game' AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')`;
  return (r?.p as number) ?? 0;
}
