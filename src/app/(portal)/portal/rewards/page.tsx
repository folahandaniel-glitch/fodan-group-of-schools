import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { TierLogo } from "@/components/tier-logo";
import { totals } from "@/lib/loyalty";
import { POINTS, TIERS, progress } from "@/lib/logic/loyalty";
import { gameOf } from "@/lib/logic/games";

export const metadata = { title: "Rewards" };
export const dynamic = "force-dynamic";

const SRC: Record<string, string> = { study: "Study", work: "Classwork & assignments", game: "Games" };

export default async function Rewards() {
  const me = await requireMe();
  const t = await totals(me.id);
  const events = await sql`SELECT source, points, detail, created_at FROM reward_events WHERE user_id = ${me.id} ORDER BY created_at DESC LIMIT 15`;
  const rounds = await sql`SELECT game, level, correct, total, finished_at FROM game_rounds WHERE user_id = ${me.id} AND status = 'done' ORDER BY finished_at DESC LIMIT 8`;
  const kids = me.role === "parent" ? await sql`
    SELECT s.id, s.first_name, s.last_name, s.user_id, COALESCE((SELECT sum(points) FROM reward_events e WHERE e.user_id = s.user_id), 0)::int AS pts
    FROM parent_links l JOIN students s ON s.id = l.student_id WHERE l.parent_id = ${me.id} AND l.status = 'active' ORDER BY s.first_name` : [];
  const staff = !["student", "parent"].includes(me.role);
  const board = await sql`
    SELECT u.id, u.first_name, u.last_name, u.role, COALESCE(sum(e.points),0)::int AS pts
    FROM users u JOIN reward_events e ON e.user_id = u.id
    WHERE u.school_id = ${me.schoolId} AND u.role <> 'developer' ${staff ? sql`` : sql`AND u.role = 'student'`}
    GROUP BY u.id ORDER BY pts DESC LIMIT 10`;
  const [sch] = staff ? await sql`SELECT count(DISTINCT user_id)::int AS people, COALESCE(sum(points),0)::int AS pts FROM reward_events WHERE school_id = ${me.schoolId}` : [];
  const studyShare = t.total ? Math.round(((t.by.study + t.by.work) / t.total) * 100) : 0;
  const name = (r: Record<string, unknown>) => `${r.first_name} ${staff ? r.last_name : String(r.last_name ?? "").slice(0, 1) + "."}`;

  return (
    <>
      <PageHeader title="Loyalty & rewards" sub="Earn points by getting answers right in Study, classwork, assignments and games. Study and school work are worth far more than games." />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-5">
          <TierLogo index={t.index} size={110} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Your loyalty level</p>
            <p className="text-3xl font-black">{t.tier.name}</p>
            <p className="text-sm text-muted">{t.total} points{t.next ? ` · ${t.toNext} more to reach ${t.next.name}` : " · highest level reached"}</p>
            <div className="mt-3 h-3 max-w-md overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-strong" style={{ width: `${t.pct}%` }} /></div>
          </div>
          {t.next && <div className="text-center"><TierLogo index={t.index + 1} size={56} locked /><p className="text-xs text-muted">Next: {t.next.name}</p></div>}
        </div>
      </Card>
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Study" value={t.by.study} hint={`${POINTS.topicStudied} per topic`} />
        <Stat label="Classwork & assignments" value={t.by.work} hint={`${POINTS.perCorrectWork} per correct answer`} tone="royal" />
        <Stat label="Games" value={t.by.game} hint={`up to ${POINTS.gameDailyCap} a day`} />
        <Stat label="From learning" value={`${studyShare}%`} hint="study + school work" />
      </section>
      {kids.length > 0 && (
        <Card className="mb-5"><h2 className="text-xl">My children</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{kids.map((k) => { const p = progress(k.pts as number); return (
            <div key={k.id as string} className="flex items-center gap-3 rounded-xl border border-line p-3"><TierLogo index={p.index} size={52} /><div><p className="font-bold">{k.first_name as string} {k.last_name as string}</p><p className="text-sm text-muted">{p.tier.name} · {k.pts as number} pts</p></div></div>); })}</div>
          <p className="mt-3 text-sm"><Link href="/portal/children" className="font-semibold underline">See each child&rsquo;s results and progress</Link></p></Card>
      )}
      {staff && sch && <section className="mb-5 grid grid-cols-2 gap-3"><Stat label="People earning rewards" value={sch.people} /><Stat label="Points earned school-wide" value={sch.pts} tone="royal" /></section>}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card><h2 className="text-xl">Top 10 {staff ? "in the school" : "learners"}</h2>
          {board.length === 0 ? <div className="mt-3"><Empty title="No points yet" /></div> : (
            <ol className="mt-3 space-y-2">{board.map((b, i) => { const p = progress(b.pts as number); return (
              <li key={b.id as string} className={`flex items-center gap-3 rounded-lg px-2 py-1 ${b.id === me.id ? "bg-gold-soft" : ""}`}><span className="w-6 text-center font-bold">{i + 1}</span><TierLogo index={p.index} size={34} /><span className="flex-1 truncate font-semibold">{name(b)}</span><span className="text-sm text-muted">{p.tier.name} · {b.pts as number}</span></li>); })}</ol>)}
        </Card>
        <Card><h2 className="text-xl">Recent points</h2>
          {events.length === 0 ? <div className="mt-3"><Empty title="Nothing yet">Finish a study topic or play a game to begin.</Empty></div> : (
            <ul className="mt-3 divide-y divide-line text-sm">{events.map((e, i) => (
              <li key={i} className="flex justify-between gap-3 py-2"><span><b>{SRC[e.source as string]}</b> · {e.detail as string}</span><span className="font-bold text-ok">+{e.points as number}</span></li>))}</ul>)}
          {rounds.length > 0 && <p className="mt-3 text-xs text-muted">Recent games: {rounds.map((r) => `${gameOf(r.game as string)?.title} ${r.level} ${r.correct}/${r.total}`).join(" · ")}</p>}
        </Card>
      </div>
      <Card><h2 className="text-xl">All loyalty levels</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">{TIERS.map((x, i) => (
          <div key={x.name} className="text-center"><TierLogo index={i} size={60} locked={i > t.index} /><p className="mt-1 text-xs font-bold">{x.name}</p><p className="text-[0.7rem] text-muted">{x.min}+ pts</p></div>))}</div>
      </Card>
    </>
  );
}
