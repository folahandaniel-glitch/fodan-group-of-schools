"use server";
import { randomInt } from "node:crypto";
import { sql } from "@/lib/db";
import { requireMe } from "@/lib/auth";
import { award, gameToday } from "@/lib/loyalty";
import { gamePoints } from "@/lib/logic/loyalty";
import { LEVELS, buildRound, gameOf, scoreRound, type Level } from "@/lib/logic/games";
import { rateLimit } from "@/lib/security";

/** Starts a round and returns its id. The questions are rebuilt from the saved seed whenever they are needed. */
export async function startRound(game: string, level: string): Promise<{ id?: string; error?: string }> {
  const me = await requireMe();
  if (!gameOf(game) || !LEVELS.includes(level as Level)) return { error: "Unknown game." };
  if (!(await rateLimit(`game:${me.id}`, 60, 3600))) return { error: "That is a lot of rounds. Take a short break and learn something else first." };
  const [r] = await sql`INSERT INTO game_rounds (school_id, user_id, game, level, seed) VALUES (${me.schoolId}, ${me.id}, ${game}, ${level}, ${randomInt(1, 2_000_000_000)}) RETURNING id`;
  return { id: r.id as string };
}

/** Marks one answer as it is given, so the player sees right or wrong and a running score. The answer is stored and cannot be changed. */
export async function checkAnswer(roundId: string, index: number, choice: number): Promise<{ right?: number; error?: string }> {
  const me = await requireMe();
  if (!/^[0-9a-f-]{36}$/i.test(roundId) || !Number.isInteger(index) || !Number.isInteger(choice)) return { error: "Invalid answer." };
  const [r] = await sql`SELECT game, level, seed, status, answers FROM game_rounds WHERE id = ${roundId} AND user_id = ${me.id}`;
  if (!r || r.status !== "open") return { error: "This round is finished." };
  const qs = buildRound(r.game as string, r.level as Level, Number(r.seed));
  const have = (r.answers as number[]) ?? [];
  if (index < 0 || index >= qs.length || index > have.length) return { error: "Answer the questions in order." };
  if (index === have.length) await sql`UPDATE game_rounds SET answers = ${sql.json([...have, choice])} WHERE id = ${roundId} AND status = 'open' AND jsonb_array_length(answers) = ${have.length}`;
  return { right: qs[index].answer };
}

export type Finish = { error?: string; correct?: number; total?: number; points?: number; capped?: boolean; answers?: number[] };

/** Marks the round on the server. Answers come from the player; the right answers never leave the server until the round ends. */
export async function finishRound(roundId: string, answers: number[]): Promise<Finish> {
  const me = await requireMe();
  if (!/^[0-9a-f-]{36}$/i.test(roundId) || !Array.isArray(answers)) return { error: "Round not found." };
  const [r] = await sql`SELECT id, game, level, seed, status, answers FROM game_rounds WHERE id = ${roundId} AND user_id = ${me.id}`;
  if (!r || r.status !== "open") return { error: "This round is already finished." };
  const qs = buildRound(r.game as string, r.level as Level, Number(r.seed));
  const stored = (r.answers as number[]) ?? [];
  const clean = qs.map((_, i) => (Number.isInteger(stored[i]) ? stored[i] : Number.isInteger(answers[i]) && i >= stored.length ? answers[i] : -1));
  const correct = scoreRound(qs, clean);
  const today = await gameToday(me.id);
  const pts = gamePoints(r.level as string, correct, qs.length, today);
  const [upd] = await sql`UPDATE game_rounds SET status = 'done', correct = ${correct}, total = ${qs.length}, points = ${pts}, finished_at = now() WHERE id = ${roundId} AND status = 'open' RETURNING id`;
  if (!upd) return { error: "This round is already finished." };
  await award(me.schoolId, me.id, "game", roundId, pts, `${gameOf(r.game as string)?.title} (${r.level}): ${correct}/${qs.length}`);
  return { correct, total: qs.length, points: pts, capped: pts === 0 && correct > 0, answers: qs.map((q) => q.answer) };
}
