import Link from "next/link";
import { requireMe } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { TierLogo } from "@/components/tier-logo";
import { gameToday, totals } from "@/lib/loyalty";
import { POINTS } from "@/lib/logic/loyalty";
import { GAMES, LEVELS } from "@/lib/logic/games";

export const metadata = { title: "Games" };
export const dynamic = "force-dynamic";

export default async function Games() {
  const me = await requireMe();
  const [t, today] = await Promise.all([totals(me.id), gameToday(me.id)]);
  return (
    <>
      <PageHeader title="Learning games" sub="Every game has Easy, Medium and Hard. Games earn reward points, but Study and classwork earn far more." />
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <TierLogo index={t.index} size={72} />
          <div className="min-w-0 flex-1"><p className="text-sm text-muted">Your loyalty level</p><p className="text-2xl font-black">{t.tier.name}</p><p className="text-sm text-muted">{t.total} points{t.next ? ` · ${t.toNext} to ${t.next.name}` : ""}</p></div>
          <div className="text-sm"><p>Game points today: <b>{today}/{POINTS.gameDailyCap}</b></p><p className="mt-1"><Link href="/portal/study" className="font-semibold underline">Study earns {POINTS.topicStudied} per topic</Link> · <Link href="/portal/rewards" className="font-semibold underline">My rewards</Link></p></div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GAMES.map((g) => (
          <Card key={g.key}>
            <p className="text-3xl" aria-hidden>{g.icon}</p>
            <h2 className="mt-1 text-xl">{g.title}</h2>
            <p className="mt-1 text-sm text-muted">{g.blurb}</p>
            <div className="mt-3 flex gap-2">{LEVELS.map((l) => <Link key={l} href={`/portal/games/${g.key}?level=${l}`} className="btn btn-ghost btn-sm capitalize">{l}</Link>)}</div>
          </Card>
        ))}
      </div>
    </>
  );
}
