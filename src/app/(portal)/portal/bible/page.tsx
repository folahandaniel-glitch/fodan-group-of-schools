import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { str } from "@/lib/data";
import { BOOKS, bookName, chapter, search, versions } from "@/lib/bible";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { loadVersionText, saveVersion } from "./actions";

export const metadata = { title: "Holy Bible" };
export const dynamic = "force-dynamic";

export default async function Bible({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const all = await versions();
  const vs = all.filter((v) => v.active);
  const v = vs.find((x) => x.code === str(sp.v)) ?? vs[0];
  const book = Number(str(sp.b)) || 0, ch = Number(str(sp.c)) || 0;
  const q = str(sp.q).trim().slice(0, 60);
  const manage = can(me, "settings:edit") || can(me, "cms:edit") || can(me, "*");
  const link = (b: number, c: number, code = v?.code) => `/portal/bible?v=${code}&b=${b}&c=${c}`;

  const picker = (
    <form className="flex flex-wrap items-center gap-2" role="search">
      <select name="v" defaultValue={v?.code} className="select !w-auto" aria-label="Bible version">{vs.map((x) => <option key={x.code} value={x.code}>{x.code} · {x.name}</option>)}</select>
      <input name="q" defaultValue={q} className="input !w-56" placeholder="Search words, e.g. love" aria-label="Search the Bible" />
      <button className="btn btn-primary btn-sm">Search</button>
    </form>
  );

  let body: React.ReactNode;
  if (!v) body = <Card><p>No Bible version is enabled. A Super Admin can enable one below.</p></Card>;
  else if (q.length >= 3) {
    const hits = await search(v, q);
    body = (
      <Card><h2 className="text-xl">“{q}” in {v.code}</h2>
        {hits.length === 0 ? <p className="mt-2 text-sm text-muted">No verses found.</p> : (
          <ul className="mt-3 space-y-3">{hits.map((h) => (
            <li key={`${h.book}.${h.ch}.${h.verse}`}><Link className="font-bold text-royal" href={link(h.book, h.ch)}>{bookName(h.book)} {h.ch}:{h.verse}</Link><p className="text-sm">{h.text}</p></li>))}
          </ul>)}
      </Card>);
  } else if (book && ch) {
    const p = await chapter(v, book, ch);
    const info = BOOKS.find((b) => b.n === book)!;
    const prev = ch > 1 ? link(book, ch - 1) : book > 1 ? link(book - 1, BOOKS[book - 2].ch) : null;
    const next = ch < info.ch ? link(book, ch + 1) : book < 66 ? link(book + 1, 1) : null;
    body = (
      <Card>
        <p className="eyebrow">{v.name}</p>
        <h2 className="text-2xl">{info.name} {ch}</h2>
        <div className="rule-gold my-3" />
        {"verses" in p && <div className="space-y-1.5 text-[1.05rem] leading-8">{p.verses.map((t, i) => <p key={i}><sup className="mr-1 font-bold text-gold">{i + 1}</sup>{t}</p>)}</div>}
        {"text" in p && <div className="whitespace-pre-wrap text-[1.05rem] leading-8">{p.text}</div>}
        {"missing" in p && <p className="rounded-xl bg-paper-2 p-4 text-sm">{p.missing}</p>}
        <div className="mt-5 flex justify-between text-sm">
          {prev ? <Link className="btn btn-ghost btn-sm" href={prev}>← Previous</Link> : <span />}
          {next ? <Link className="btn btn-primary btn-sm" href={next}>Next →</Link> : <span />}
        </div>
        <p className="mt-4 text-xs text-muted">Switch version: {vs.map((x) => <Link key={x.code} href={link(book, ch, x.code)} className={`mr-2 font-bold ${x.code === v.code ? "text-ink" : "text-royal"}`}>{x.code}</Link>)}</p>
      </Card>);
  } else if (book) {
    const info = BOOKS.find((b) => b.n === book);
    body = !info ? null : (
      <Card><h2 className="text-xl">{info.name}</h2>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">{Array.from({ length: info.ch }, (_, i) => (
          <Link key={i} href={link(book, i + 1)} className="rounded-xl border border-line bg-card py-2.5 text-center font-bold text-royal hover:border-gold-2">{i + 1}</Link>))}</div>
        <Link href={`/portal/bible?v=${v.code}`} className="mt-4 inline-block text-sm font-bold text-royal">← All books</Link></Card>);
  } else {
    const group = (title: string, from: number, to: number) => (
      <Card key={title}><h2 className="text-xl">{title}</h2>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">{BOOKS.filter((b) => b.n >= from && b.n <= to).map((b) => (
          <Link key={b.n} href={`/portal/bible?v=${v.code}&b=${b.n}`} className="rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold hover:border-gold-2">{b.name}</Link>))}</div></Card>);
    body = <div className="space-y-5">{group("Old Testament", 1, 39)}{group("New Testament", 40, 66)}</div>;
  }

  return (
    <>
      <PageHeader title="Holy Bible" sub="Read the Scriptures by book and chapter, or search for any word." actions={picker} />
      {body}
      {manage && (
        <Card className="mt-8">
          <h2 className="text-xl">Manage versions</h2>
          <p className="mt-1 text-sm text-muted">KJV is built in (public domain). NIV and Good News Bible are copyrighted: load a licensed text file, or paste an API.Bible Bible ID (the server needs BIBLE_API_KEY) so the text is fetched on demand.</p>
          <ul className="mt-4 space-y-4">
            {all.map((x) => (
              <li key={x.code} className="rounded-xl border border-line p-3">
                <p className="font-bold">{x.code} · {x.name} {x.active ? <Badge tone="ok">on</Badge> : <Badge>off</Badge>} <Badge tone="info">{x.source === "file" ? "built in" : "loaded / API"}</Badge></p>
                {x.source !== "file" && (
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <ActionForm action={saveVersion} submit="Save" small className="grid gap-2">
                      <input type="hidden" name="code" value={x.code} />
                      <Field label="Name" name="name" defaultValue={x.name} /><Field label="API.Bible Bible ID (optional)" name="apiId" defaultValue={x.api_bible_id} />
                      <Field label="Licence note" name="license" defaultValue={x.license} />
                      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={x.active} /> Show to users</label>
                    </ActionForm>
                    <ActionForm action={loadVersionText} submit="Load text" small className="grid gap-2" encType="multipart/form-data">
                      <input type="hidden" name="code" value={x.code} />
                      <div className="field"><label htmlFor={`f-${x.code}`}>Licensed text (JSON, 66 books)</label><input id={`f-${x.code}`} name="file" type="file" accept="application/json,.json" className="input" /></div>
                      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="licensed" className="mt-1" /> The school holds the licence to use this text.</label>
                    </ActionForm>
                  </div>
                )}
              </li>))}
          </ul>
          <details className="mt-4"><summary className="cursor-pointer font-bold text-royal">Add another version</summary>
            <ActionForm action={saveVersion} submit="Add version" className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="isNew" value="1" />
              <Field label="Code (e.g. ESV)" name="code" required /><Field label="Name" name="name" required />
              <Field label="API.Bible Bible ID (optional)" name="apiId" /><Field label="Licence note" name="license" />
            </ActionForm></details>
        </Card>
      )}
    </>
  );
}
