import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { canCreate, canManage, canView, loadModules } from "@/lib/modules";
import { listStaff, pageParams, str } from "@/lib/data";
import { Badge, Card, Empty, Field, PageHeader, Pager, Select, TextArea, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createRecord } from "../actions";

export const dynamic = "force-dynamic";

export default async function ModulePage({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const { module: key } = await params;
  const sp = await searchParams;
  const m = (await loadModules()).find((x) => x.key === key);
  if (!m || !canView(me, m)) notFound();
  const mgr = canManage(me, m);
  const status = str(sp.status), q = str(sp.q).trim();
  const { page, size, offset } = pageParams(sp, m.board ? 100 : 20);
  const where = sql`r.school_id = ${me.schoolId} AND r.module = ${m.key}
    ${m.ownOnly && !mgr ? sql`AND (r.owner_id = ${me.id} OR r.assignee_id = ${me.id})` : sql``}
    ${!mgr && ["forum", "kb", "memos"].includes(m.key) ? sql`AND (r.status IN ('open','locked','published') OR r.owner_id = ${me.id})` : sql``}
    ${status ? sql`AND r.status = ${status}` : sql``} ${q ? sql`AND (r.title ILIKE ${"%" + q + "%"} OR r.body ILIKE ${"%" + q + "%"})` : sql``}`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM records r WHERE ${where}`;
  const rows = await sql`SELECT r.id, r.title, r.status, r.data, r.due_on, r.pinned, r.created_at, r.updated_at,
      o.first_name || ' ' || o.last_name AS owner, a.first_name || ' ' || a.last_name AS assignee,
      (SELECT count(*)::int FROM record_replies p WHERE p.record_id = r.id AND NOT p.hidden) AS replies
    FROM records r LEFT JOIN users o ON o.id = r.owner_id LEFT JOIN users a ON a.id = r.assignee_id
    WHERE ${where} ORDER BY r.pinned DESC, r.updated_at DESC LIMIT ${size} OFFSET ${offset}`;
  const staff = m.assignable && mgr ? await listStaff(me.schoolId) : [];
  const fmt = (d: unknown) => new Date(String(d)).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const row = (r: (typeof rows)[number]) => (
    <Link href={`/portal/m/${m.key}/${r.id}`} className="block font-bold text-royal hover:underline">{r.pinned ? "📌 " : ""}{r.title}</Link>
  );

  return (
    <>
      <PageHeader eyebrow={m.origin} title={m.label} sub={m.blurb} />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Status filter">
        {["", ...m.statuses].map((s) => <Link key={s} href={s ? `/portal/m/${m.key}?status=${s}` : `/portal/m/${m.key}`} className={`badge capitalize ${status === s ? "badge-info" : ""}`}>{(s || "all").replace("_", " ")}</Link>)}
      </nav>

      {canCreate(me, m) && (
        <details className="card card-pad mb-5">
          <summary className="cursor-pointer font-display text-lg">New {m.label.toLowerCase().replace(/s$/, "")}</summary>
          <div className="mt-4">
            <ActionForm action={createRecord} submit="Submit" className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="module" value={m.key} />
              <div className="sm:col-span-2"><Field label="Title" name="title" required /></div>
              {m.fields.map((f) => f.type === "select"
                ? <Select key={f.name} label={f.label} name={`f_${f.name}`} required={f.required} options={(f.options ?? []).map((o) => ({ value: o, label: o }))} />
                : <Field key={f.name} label={f.label} name={`f_${f.name}`} type={f.type === "date" ? "date" : "text"} required={f.required} />)}
              {m.dated && <Field label="Due date" name="due" type="date" />}
              {m.assignable && mgr && <Select label="Assign to" name="assignee" options={staff.map((s) => ({ value: s.id, label: `${s.last_name}, ${s.first_name}` }))} />}
              {mgr && m.statuses.length > 1 && <Select label="Status" name="status" allowEmpty={false} defaultValue={m.defaultStatus} options={m.statuses.map((s) => ({ value: s, label: s.replace("_", " ") }))} />}
              <div className="sm:col-span-2"><TextArea label="Details" name="body" rows={4} /></div>
            </ActionForm>
          </div>
        </details>
      )}

      <form className="mb-4 flex gap-2" role="search"><input name="q" defaultValue={q} className="input" placeholder={`Search ${m.label.toLowerCase()}`} aria-label="Search" /><button className="btn btn-primary">Search</button></form>

      {rows.length === 0 ? <Empty title={`No ${m.label.toLowerCase()} yet`} /> : m.board ? (
        <div className="grid gap-4 md:grid-cols-4">
          {m.statuses.map((s) => (
            <section key={s} aria-label={s}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">{s.replace("_", " ")} ({rows.filter((r) => r.status === s).length})</h2>
              <div className="grid gap-2">
                {rows.filter((r) => r.status === s).map((r) => (
                  <Card key={r.id} className="!p-3 text-sm">{row(r)}
                    <p className="mt-1 text-xs text-muted">{r.assignee ? `→ ${r.assignee}` : "Unassigned"}{r.due_on ? ` · due ${fmt(r.due_on)}` : ""}</p>
                    {r.data?.priority && <Badge tone={["High", "Urgent"].includes(r.data.priority) ? "warn" : undefined}>{r.data.priority}</Badge>}</Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Title</th><th>By</th>{m.fields[0] && <th>{m.fields[0].label}</th>}<th>Replies</th><th>Updated</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}><td>{row(r)}</td><td className="text-sm">{r.owner}</td>
                  {m.fields[0] && <td className="text-sm">{r.data?.[m.fields[0].name]}{m.key === "leave" && r.data?.from ? ` ${r.data.from} → ${r.data.to}` : ""}</td>}
                  <td>{r.replies}</td><td className="text-xs text-muted">{fmt(r.updated_at)}</td><td><Badge tone={statusTone(r.status)}>{r.status.replace("_", " ")}</Badge></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={Math.ceil(n / size)} base={`/portal/m/${m.key}?status=${status}&q=${encodeURIComponent(q)}`} />
    </>
  );
}
