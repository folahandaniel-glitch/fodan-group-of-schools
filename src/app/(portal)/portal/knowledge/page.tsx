import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { TOPICS } from "@/data/knowledge";
import { ensureKnowledge } from "@/lib/kh";
import { Card, Empty, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addEntry, deleteEntry } from "./actions";

export const metadata = { title: "Knowledge Hub" };
export const dynamic = "force-dynamic";

export default async function Knowledge({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const manage = can(me, "knowledge:manage");
  await ensureKnowledge(me.schoolId);
  const adult = me.role !== "student";
  const topics = TOPICS.filter((t) => t.audience === "all" || adult);
  const t = topics.find((x) => x.key === str(sp.t));
  const q = str(sp.q).trim().slice(0, 60), letter = str(sp.l).toLowerCase().slice(0, 1);
  const like = "%" + q.replace(/[%_\\]/g, "") + "%";
  const rows = t ? await sql`SELECT id, title, body FROM kh_entries WHERE school_id = ${me.schoolId} AND topic = ${t.key} ${q ? sql`AND (title ILIKE ${like} OR body ILIKE ${like})` : sql``} ${t.key === "dictionary" && /^[a-z]$/.test(letter) ? sql`AND title ILIKE ${letter + "%"}` : sql``} ORDER BY lower(title) LIMIT 600` : [];
  const found = !t && q ? await sql`SELECT id, topic, title, body FROM kh_entries WHERE school_id = ${me.schoolId} AND (audience = 'all' ${adult ? sql`OR audience = 'adults'` : sql``}) AND (title ILIKE ${like} OR body ILIKE ${like}) ORDER BY title LIMIT 60` : [];
  const label = (k: string) => TOPICS.find((x) => x.key === k)?.label ?? k;

  return (
    <>
      <PageHeader title="Knowledge Hub" sub={t ? t.blurb : "Learn more than the classroom teaches: science, language, discoveries, people and places, and life skills."}
        actions={t && <Link href="/portal/knowledge" className="btn btn-ghost btn-sm">← All topics</Link>} />
      <Card className="mb-5"><form className="flex flex-wrap gap-2" role="search">{t && <input type="hidden" name="t" value={t.key} />}
        <input name="q" defaultValue={q} className="input !w-72" placeholder={t ? `Search ${t.label}` : "Search everything"} aria-label="Search" /><button className="btn btn-primary btn-sm">Search</button></form></Card>

      {!t && !q && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{topics.map((x) => (
          <Link key={x.key} href={`/portal/knowledge?t=${x.key}`} className="card card-pad block hover:border-strong"><p className="text-3xl" aria-hidden>{x.icon}</p><h2 className="mt-1 text-xl">{x.label}</h2><p className="mt-1 text-sm text-muted">{x.blurb}</p>
            {x.audience === "adults" && <span className="badge mt-2">Staff and parents</span>}</Link>))}</div>
      )}

      {!t && q && (found.length === 0 ? <Empty title="Nothing found" /> : <div className="grid gap-3">{found.map((e) => <Card key={e.id as string}><p className="text-xs font-bold uppercase tracking-wider text-muted">{label(e.topic as string)}</p><h3 className="text-lg">{e.title as string}</h3><p className="mt-1 whitespace-pre-line text-sm text-ink-2">{e.body as string}</p></Card>)}</div>)}

      {t && (
        <>
          {t.note && <p role="note" className="mb-4 rounded-xl border border-gold-2 bg-gold-soft px-4 py-3 text-sm font-semibold">{t.note}</p>}
          {t.key === "law" && <p role="note" className="mb-4 rounded-xl border border-line bg-paper-2 px-4 py-3 text-sm">General information only. Not legal advice.</p>}
          {t.key === "dictionary" && (
            <Card className="mb-5"><h2 className="text-xl">School dictionary</h2>
              <p className="mt-1 text-sm text-muted">Words, meanings and word classes written for learners. Search above, or pick a letter. Staff with access can add words.</p>
              <nav className="mt-3 flex flex-wrap gap-1" aria-label="Letters"><Link href="/portal/knowledge?t=dictionary" className={`badge ${!letter ? "badge-info" : ""}`}>All</Link>{"abcdefghijklmnopqrstuvwxyz".split("").map((c) => <Link key={c} href={`/portal/knowledge?t=dictionary&l=${c}`} className={`badge uppercase ${letter === c ? "badge-info" : ""}`}>{c}</Link>)}</nav></Card>)}
          {rows.length === 0 ? <Empty title="No entries">{q ? "Try another search." : "Nothing here yet."}</Empty> : (
            <div className="grid gap-3 md:grid-cols-2">{rows.map((e) => (
              <Card key={e.id as string}><div className="flex items-start justify-between gap-2"><h3 className="text-lg">{e.title as string}</h3>
                {manage && <form action={deleteEntry}><input type="hidden" name="id" value={e.id as string} /><button className="btn btn-ghost btn-sm" aria-label="Delete entry">✕</button></form>}</div>
                <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{e.body as string}</p></Card>))}</div>)}
          {manage && (
            <Card className="mt-5"><h2 className="text-xl">Add an entry to {t.label}</h2>
              <ActionForm action={addEntry} submit="Save entry" className="mt-3 grid gap-3"><input type="hidden" name="topic" value={t.key} /><Field label="Title" name="title" required /><TextArea label="Entry" name="body" rows={4} required /></ActionForm></Card>)}
        </>
      )}
    </>
  );
}
