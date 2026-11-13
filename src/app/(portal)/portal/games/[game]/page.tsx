import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { LEVELS, buildRound, gameOf, type Level } from "@/lib/logic/games";
import { POINTS } from "@/lib/logic/loyalty";
import { Player } from "../player";
import { Starter } from "../starter";

export const dynamic = "force-dynamic";

export default async function Play({ params, searchParams }: { params: Promise<{ game: string }>; searchParams: Promise<{ level?: string; r?: string }> }) {
  const me = await requireMe();
  const { game } = await params, sp = await searchParams;
  const g = gameOf(game);
  if (!g) notFound();
  const level = (LEVELS.includes(sp.level as Level) ? sp.level : "easy") as Level;
  let round: { id: string; seed: number } | null = null;
  if (sp.r && /^[0-9a-f-]{36}$/i.test(sp.r)) {
    const [r] = await sql`SELECT id, seed, level, status FROM game_rounds WHERE id = ${sp.r} AND user_id = ${me.id} AND game = ${game} AND status = 'open'`;
    if (r) round = { id: r.id as string, seed: Number(r.seed) };
  }
  const lv = round ? ((await sql`SELECT level FROM game_rounds WHERE id = ${round.id}`)[0].level as Level) : level;
  return (
    <>
      <PageHeader title={`${g.icon} ${g.title}`} sub={g.blurb} actions={<Link href="/portal/games" className="btn btn-ghost btn-sm">All games</Link>} />
      <Card>
        {round ? <Player roundId={round.id} game={game} level={lv} questions={buildRound(game, lv, round.seed).map((q) => ({ ...q, answer: -1 }))} /> : (
          <div className="text-center">
            <p className="text-sm text-muted">Choose your level</p>
            <div className="mt-3 flex flex-wrap justify-center gap-3">{LEVELS.map((l) => <Starter key={l} game={game} level={l} active={l === level} />)}</div>
            <p className="mt-4 text-sm text-muted">Each correct answer earns {POINTS.perCorrectGame[level]} points on {level}. Game points are capped at {POINTS.gameDailyCap} a day so Study always comes first.</p>
          </div>
        )}
      </Card>
    </>
  );
}
