import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";
type Chapter = { title: string; body: string };

export default async function Read({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string }> }) {
  const me = await requireMe();
  if (!can(me, "library:view") && !can(me, "library:manage")) redirect("/forbidden");
  const { id } = await params, sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [b] = await sql`SELECT title, author, category, level, summary, chapters FROM lib_books WHERE id = ${id} AND school_id = ${me.schoolId} AND chapters IS NOT NULL`;
  if (!b) notFound();
  const chapters = b.chapters as Chapter[];
  const i = Math.min(Math.max(parseInt(sp.c ?? "1", 10) || 1, 1), chapters.length), ch = chapters[i - 1];
  return (
    <>
      <PageHeader eyebrow={`${b.category} · ${b.level ?? ""}`} title={b.title as string} sub={`By ${b.author}`} actions={<div className="no-print flex gap-2"><PrintButton label="Print" /><Link href="/portal/library" className="btn btn-ghost btn-sm">← Library</Link></div>} />
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="no-print card card-pad h-fit text-sm" aria-label="Chapters"><p className="mb-2 font-bold">Chapters</p><ol className="space-y-1">{chapters.map((c, k) => <li key={k}><Link href={`?c=${k + 1}`} className={`block rounded-lg px-2 py-1 ${k + 1 === i ? "bg-strong font-bold text-white" : "hover:bg-paper-2"}`}>{k + 1}. {c.title}</Link></li>)}</ol></nav>
        <Card><h2 className="text-2xl">{ch.title}</h2><div className="mt-3 space-y-4 text-[1.05rem] leading-8">{ch.body.split(/\n\n+/).map((p, k) => <p key={k} className="whitespace-pre-line">{p}</p>)}</div>
          <div className="no-print mt-6 flex justify-between">{i > 1 ? <Link href={`?c=${i - 1}`} className="btn btn-ghost">← Previous</Link> : <span />}{i < chapters.length ? <Link href={`?c=${i + 1}`} className="btn btn-primary">Next chapter →</Link> : <span />}</div></Card>
      </div>
    </>
  );
}
