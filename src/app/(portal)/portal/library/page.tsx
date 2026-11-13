import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { childIds, studentOf } from "@/lib/scope";
import { redirect } from "next/navigation";
import { Badge, Card, Empty, Field, PageHeader, Stat } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addBook, deleteBook, issueBook, returnBook } from "./actions";

export const metadata = { title: "Library" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;
const day = (d: unknown) => new Date(String(d)).toLocaleDateString("en-GB");

export default async function Library({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "library:view") && !can(me, "library:manage")) redirect("/forbidden");
  const manage = can(me, "library:manage");
  const sp = await searchParams;
  const q = str(sp.q).trim().slice(0, 60);
  const like = "%" + q.replace(/[%_\\]/g, "") + "%";
  const books: Row[] = await sql`SELECT b.*, (SELECT count(*)::int FROM lib_loans l WHERE l.book_id = b.id AND l.returned_on IS NULL) AS out FROM lib_books b
    WHERE b.school_id = ${me.schoolId} ${q ? sql`AND (b.title ILIKE ${like} OR b.author ILIKE ${like} OR b.isbn ILIKE ${like} OR b.category ILIKE ${like})` : sql``} ORDER BY b.title LIMIT 300`;
  const open: Row[] = manage ? await sql`SELECT l.id, l.issued_on, l.due_on, b.title, coalesce(s.first_name || ' ' || s.last_name, u.first_name || ' ' || u.last_name) AS who, s.admission_no
    FROM lib_loans l JOIN lib_books b ON b.id = l.book_id LEFT JOIN students s ON s.id = l.student_id LEFT JOIN users u ON u.id = l.user_id
    WHERE l.school_id = ${me.schoolId} AND l.returned_on IS NULL ORDER BY l.due_on LIMIT 200` : [];
  let mine: Row[] = [];
  if (!manage) {
    const ids = me.role === "student" ? [(await studentOf(me.id))?.id as string].filter(Boolean) : me.role === "parent" ? await childIds(me.id) : [];
    mine = await sql`SELECT l.due_on, l.issued_on, l.returned_on, b.title FROM lib_loans l JOIN lib_books b ON b.id = l.book_id
      WHERE l.school_id = ${me.schoolId} AND (l.user_id = ${me.id} ${ids.length ? sql`OR l.student_id = ANY(${ids})` : sql``}) ORDER BY l.issued_on DESC LIMIT 30`;
  }
  const overdue = open.filter((o) => new Date(String(o.due_on)) < new Date(new Date().toISOString().slice(0, 10))).length;

  return (
    <>
      <PageHeader title="Library" sub="Search the catalogue. Librarians add books, lend them and record returns." />
      {manage && <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Titles" value={books.length} /><Stat label="On loan" value={open.length} tone="royal" /><Stat label="Overdue" value={overdue} /><Stat label="Copies" value={books.reduce((a, b) => a + b.copies, 0)} tone="royal" /></section>}
      <Card className="mb-5"><form className="flex gap-2" role="search"><input name="q" defaultValue={q} className="input" placeholder="Search title, author, subject or ISBN" aria-label="Search the library" /><button className="btn btn-primary">Search</button></form></Card>

      {manage && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Card><h2 className="text-xl">Add a book</h2>
            <ActionForm action={addBook} submit="Add book" className="mt-3 grid gap-2 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Title" name="title" required /></div>
              <Field label="Author" name="author" /><Field label="ISBN" name="isbn" /><Field label="Subject / category" name="category" placeholder="General" /><Field label="Shelf" name="shelf" /><Field label="Copies" name="copies" type="number" min={0} defaultValue={1} /></ActionForm></Card>
          <Card><h2 className="text-xl">Lend a book</h2>
            <ActionForm action={issueBook} submit="Issue book" className="mt-3 grid gap-2">
              <div className="field"><label htmlFor="bk">Book</label><select id="bk" name="book" className="select" required><option value="">Choose…</option>{books.filter((b) => b.out < b.copies).map((b) => <option key={b.id} value={b.id}>{b.title} ({b.copies - b.out} available)</option>)}</select></div>
              <Field label="Student admission number or staff email" name="who" required /><Field label="Days to keep it" name="days" type="number" min={1} max={120} defaultValue={14} /></ActionForm></Card>
        </div>
      )}

      {manage && open.length > 0 && (
        <Card className="mb-5"><h2 className="text-xl">On loan</h2>
          <ul className="mt-2 divide-y divide-line text-sm">{open.map((o) => {
            const late = new Date(String(o.due_on)) < new Date(new Date().toISOString().slice(0, 10));
            return <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{o.title}</b> · {o.who}{o.admission_no ? ` (${o.admission_no})` : ""}<br /><span className="text-xs text-muted">Issued {day(o.issued_on)} · due {day(o.due_on)}</span></span>
              <span className="flex items-center gap-2">{late && <Badge tone="bad">Overdue</Badge>}<form action={returnBook}><input type="hidden" name="id" value={o.id} /><button className="btn btn-ghost btn-sm">Mark returned</button></form></span></li>;
          })}</ul></Card>
      )}

      {!manage && mine.length > 0 && (
        <Card className="mb-5"><h2 className="text-xl">My books</h2><ul className="mt-2 divide-y divide-line text-sm">{mine.map((m, i) => <li key={i} className="flex justify-between py-1.5"><span>{m.title}</span><span>{m.returned_on ? <Badge tone="ok">Returned</Badge> : <Badge tone={new Date(String(m.due_on)) < new Date() ? "bad" : "warn"}>Due {day(m.due_on)}</Badge>}</span></li>)}</ul></Card>
      )}

      <Card pad={false} className="overflow-x-auto">
        {books.length === 0 ? <div className="p-5"><Empty title="No books found" /></div> : (
          <table className="tbl min-w-[40rem] text-sm"><thead><tr><th>Title</th><th>Author</th><th>Subject</th><th>Shelf</th><th>Availability</th>{manage && <th></th>}</tr></thead>
            <tbody>{books.map((b) => (
              <tr key={b.id}><td className="font-bold">{b.title}</td><td>{b.author}</td><td>{b.category}</td><td>{b.shelf ?? "—"}</td><td>{b.copies - b.out > 0 ? <Badge tone="ok">{b.copies - b.out} of {b.copies} in</Badge> : <Badge tone="bad">All out</Badge>}</td>
                {manage && <td>{b.out === 0 && <form action={deleteBook}><input type="hidden" name="id" value={b.id} /><button className="btn btn-danger btn-sm">Delete</button></form>}</td>}</tr>))}</tbody></table>)}
      </Card>
    </>
  );
}
