import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pageParams, str } from "@/lib/data";
import { Badge, Card, Empty, PageHeader, Pager, statusTone } from "@/components/ui";
import { updateMessage } from "./actions";

export const metadata = { title: "Website messages" };

export default async function Comments({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("comments:view");
  const sp = await searchParams;
  const status = str(sp.status) || "new", q = str(sp.q).trim(), cat = str(sp.category);
  const { page, size, offset } = pageParams(sp, 15);
  const where = sql`school_id = ${me.schoolId} ${status !== "all" ? sql`AND status = ${status}` : sql``} ${cat ? sql`AND category = ${cat}` : sql``}
    ${q ? sql`AND (name ILIKE ${"%" + q + "%"} OR subject ILIKE ${"%" + q + "%"} OR message ILIKE ${"%" + q + "%"})` : sql``}`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM contact_messages WHERE ${where}`;
  const rows = await sql`SELECT * FROM contact_messages WHERE ${where} ORDER BY created_at DESC LIMIT ${size} OFFSET ${offset}`;
  return (
    <>
      <PageHeader title="Website messages" sub="Public contact and feedback. New messages are also sent to the school email and WhatsApp when those channels are configured."
        actions={can(me, "comments:edit") && <a className="btn btn-ghost btn-sm" href="/portal/export/comments">Export CSV</a>} />
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]" role="search">
          <input name="q" defaultValue={q} className="input" placeholder="Search" aria-label="Search messages" />
          <select name="status" className="select" defaultValue={status} aria-label="Status">{["new", "in_progress", "resolved", "archived", "all"].map((s) => <option key={s}>{s}</option>)}</select>
          <select name="category" className="select" defaultValue={cat} aria-label="Category"><option value="">Any category</option>{["General", "Admissions", "Academics", "Parents", "Results", "Technical", "Complaint", "Other"].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="btn btn-primary">Filter</button>
        </form>
      </Card>
      {rows.length === 0 ? <Empty title="No messages" /> : (
        <div className="grid gap-3">
          {rows.map((m) => (
            <Card key={m.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><Badge tone={statusTone(m.status)}>{m.status}</Badge><Badge>{m.category}</Badge>
                  <span className="text-xs text-muted">email: {m.email_status ?? "—"} · whatsapp: {m.whatsapp_status ?? "—"}</span></div>
                <span className="text-xs text-muted">{new Date(m.created_at).toLocaleString("en-GB")}</span>
              </div>
              <h2 className="mt-2 text-lg">{m.subject}</h2>
              <p className="text-sm text-muted">{m.name} · <a className="text-royal hover:underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ""}</p>
              <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
              {can(me, "comments:edit") && (
                <form action={updateMessage} className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                  <input type="hidden" name="id" value={m.id} />
                  <input name="reply" defaultValue={m.reply ?? ""} className="input" placeholder="Internal reply / note" aria-label="Reply note" />
                  <select name="status" defaultValue={m.status} className="select" aria-label="Status">{["new", "in_progress", "resolved", "archived"].map((s) => <option key={s}>{s}</option>)}</select>
                  <button className="btn btn-primary btn-sm">Save</button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
      <Pager page={page} pages={Math.ceil(n / size)} base={`/portal/comments?q=${encodeURIComponent(q)}&status=${status}&category=${cat}`} />
    </>
  );
}
