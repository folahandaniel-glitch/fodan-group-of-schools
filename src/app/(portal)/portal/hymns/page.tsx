import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { Card, Empty, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { deleteHymn, importHymns, saveHymn } from "./actions";

export const metadata = { title: "Hymn books" };
export const dynamic = "force-dynamic";

type Hymn = { id: string; book: string; number: number | null; title: string; author: string; lyrics: string };
type BookRow = { code: string; name: string; n: number };

export default async function Hymns({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const books = await sql`SELECT b.code, b.name, (SELECT count(*)::int FROM hymns h WHERE h.school_id = b.school_id AND h.book = b.code) AS n
                          FROM hymn_books b WHERE b.school_id = ${me.schoolId} ORDER BY b.sort` as unknown as BookRow[];
  const book = books.find((b) => b.code === str(sp.book))?.code ?? "";
  const q = str(sp.q).trim().slice(0, 60);
  const open = str(sp.h);
  const manage = can(me, "cms:edit") || can(me, "settings:edit") || can(me, "*");

  const rows = await sql`SELECT id, book, number, title, author FROM hymns WHERE school_id = ${me.schoolId}
    ${book ? sql`AND book = ${book}` : sql``}
    ${q ? sql`AND (title ILIKE ${"%" + q.replace(/[%_\\]/g, "") + "%"} OR lyrics ILIKE ${"%" + q.replace(/[%_\\]/g, "") + "%"} OR number::text = ${q})` : sql``}
    ORDER BY book, number NULLS LAST, title LIMIT 200`;
  const [cur] = (/^[0-9a-f-]{36}$/i.test(open) ? await sql`SELECT id, book, number, title, author, lyrics FROM hymns WHERE id = ${open} AND school_id = ${me.schoolId}` : []) as unknown as Hymn[];
  const nameOf = (c: string) => books.find((b) => b.code === c)?.name ?? c;

  return (
    <>
      <PageHeader title="Hymn books" sub="Catholic, Methodist, C&S, CAC, Baptist and Anglican hymns, searchable by number, title or words." />
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/portal/hymns" className={`badge text-sm ${!book ? "badge-info" : ""}`}>All</Link>
        {books.map((b) => <Link key={b.code} href={`/portal/hymns?book=${b.code}`} className={`badge text-sm ${book === b.code ? "badge-info" : ""}`}>{b.name} · {b.n}</Link>)}
      </div>
      <form className="mb-5 flex gap-2" role="search"><input type="hidden" name="book" value={book} />
        <input name="q" defaultValue={q} className="input" placeholder="Search by number, title or words" aria-label="Search hymns" /><button className="btn btn-primary">Search</button></form>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card pad={false}>
          {rows.length === 0 ? <div className="p-5"><Empty title="No hymns here yet">{manage ? "Use Import below to load a hymn book." : "Hymns will appear here once the school adds them."}</Empty></div> : (
            <ul className="max-h-[70dvh] divide-y divide-line overflow-y-auto">
              {rows.map((h) => (
                <li key={h.id}><Link href={`/portal/hymns?book=${book}&q=${encodeURIComponent(q)}&h=${h.id}`} className={`flex gap-3 px-4 py-3 hover:bg-paper-2 ${open === h.id ? "bg-paper-2" : ""}`}>
                  <span className="w-10 shrink-0 text-right font-display text-lg text-gold">{h.number ?? "·"}</span>
                  <span className="min-w-0"><span className="block font-bold">{h.title}</span><span className="block truncate text-xs text-muted">{nameOf(h.book)}{h.author ? ` · ${h.author}` : ""}</span></span>
                </Link></li>))}
            </ul>)}
        </Card>
        <Card>
          {cur ? (
            <article>
              <p className="eyebrow">{nameOf(cur.book)}{cur.number ? ` · No. ${cur.number}` : ""}</p>
              <h2 className="text-2xl">{cur.title}</h2>{cur.author && <p className="text-sm text-muted">{cur.author}</p>}
              <div className="rule-gold my-3" />
              <div className="whitespace-pre-wrap text-[1.05rem] leading-8">{cur.lyrics}</div>
              {manage && (
                <details className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer font-bold text-royal">Edit this hymn</summary>
                  <HymnForm books={books} h={cur} />
                  <form action={deleteHymn} className="mt-3"><input type="hidden" name="id" value={cur.id} /><button className="btn btn-danger btn-sm">Delete hymn</button></form>
                </details>)}
            </article>
          ) : <Empty title="Choose a hymn">Select a title on the left to read the words.</Empty>}
        </Card>
      </div>

      {manage && (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Card><h2 className="text-xl">Add a hymn</h2><HymnForm books={books} /></Card>
          <Card><h2 className="text-xl">Import a hymn book</h2>
            <p className="mt-1 text-sm text-muted">Paste or upload text. Separate hymns with a line of <code>===</code>. The first line of each hymn is <code>number | title | author</code>, then the words.</p>
            <ActionForm action={importHymns} submit="Import" className="mt-3 grid gap-3" encType="multipart/form-data">
              <div className="field"><label htmlFor="ib">Hymn book</label><select id="ib" name="book" className="select">{books.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></div>
              <TextArea label="Hymns" name="text" rows={8} hint="Example: 1 | Hymn title | Author, then the verses, then === on its own line." />
              <div className="field"><label htmlFor="if">Or upload a .txt file</label><input id="if" name="file" type="file" accept=".txt,text/plain" className="input" /></div>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="rights" className="mt-1" /> The school is permitted to use these hymn texts.</label>
            </ActionForm></Card>
        </div>
      )}
    </>
  );
}

function HymnForm({ books, h }: { books: { code: string; name: string }[]; h?: { id: string; book: string; number: number | null; title: string; author: string; lyrics: string } }) {
  return (
    <ActionForm action={saveHymn} submit={h ? "Save changes" : "Add hymn"} className="mt-3 grid gap-3 sm:grid-cols-2">
      {h && <input type="hidden" name="id" value={h.id} />}
      <div className="field"><label>Hymn book</label><select name="book" className="select" defaultValue={h?.book ?? "common"}>{books.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}</select></div>
      <Field label="Number" name="number" type="number" defaultValue={h?.number ?? ""} />
      <Field label="Title" name="title" defaultValue={h?.title} required /><Field label="Author / composer" name="author" defaultValue={h?.author} />
      <div className="sm:col-span-2"><TextArea label="Words" name="lyrics" rows={10} defaultValue={h?.lyrics} required /></div>
    </ActionForm>
  );
}
