import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { TOPICS } from "@/data/knowledge";
import { ensureKnowledge, lookupWord } from "@/lib/kh";
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
  const q = str(sp.q).trim().slice(0, 60), w = str(sp.w).trim();
  const like = "%" + q.replace(/[%_\\]/g, "") + "%";
  const rows = t ? await sql`SELECT id, title, body FROM kh_entries WHERE school_id = ${me.schoolId} AND topic = ${t.key} ${q ? sql`AND (title ILIKE ${like} OR body ILIKE ${like})` : sql``} ORDER BY title LIMIT 400` : [];
  const found = !t && q ? await sql`SELECT id, topic, title, body FROM kh_entries WHERE school_id = ${me.schoolId} AND (audience = 'all' ${adult ? sql`OR audience = 'adults'` : sql``}) AND (title ILIKE ${like} OR body ILIKE ${like}) ORDER BY title LIMIT 60` : [];
  const dict = t?.key === "dictionary" && w ? await lookupWord(w) : null;
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
            <Card className="mb-5"><h2 className="text-xl">Look up any word</h2>
              <form className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="t" value="dictionary" /><input name="w" defaultValue={w} className="input !w-64" placeholder="Type a word" aria-label="Word to look up" /><button className="btn btn-gold btn-sm">Define</button></form>
              {dict && ("error" in dict ? <p className="mt-3 text-sm font-semibold text-bad">{dict.error}</p> : (
                <div className="mt-3"><p className="text-2xl font-black">{dict.word} <span className="text-base font-normal text-muted">{dict.phonetic}</span></p>
                  {dict.entries.map((m, i) => <div key={i} className="mt-2"><p className="text-sm font-bold italic">{m.pos}</p><ol className="list-decimal pl-5 text-sm">{m.defs.map((d, k) => <li key={k}>{d}</li>)}</ol>{m.example && <p className="text-sm text-muted">Example: {m.example}</p>}</div>)}</div>))}
              <p className="mt-3 text-xs text-muted">Definitions come from the free dictionaryapi.dev service, so any English word can be looked up. The list below is a starter set the school can grow.</p></Card>)}
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
