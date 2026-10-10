import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { pageParams, str } from "@/lib/data";
import { Badge, Card, Empty, PageHeader, Pager, Stat } from "@/components/ui";

export const metadata = { title: "Audit & security" };
export const dynamic = "force-dynamic";

export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("audit:view");
  const sp = await searchParams;
  const cat = str(sp.category), q = str(sp.q).trim(), actor = str(sp.actor).trim();
  const { page, size, offset } = pageParams(sp, 40);
  const where = sql`school_id = ${me.schoolId} ${cat ? sql`AND category = ${cat}` : sql``} ${q ? sql`AND action ILIKE ${"%" + q + "%"}` : sql``}
    ${actor ? sql`AND actor_label ILIKE ${"%" + actor + "%"}` : sql``}`;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM audit_logs WHERE ${where}`;
  const rows = await sql`SELECT id, category, actor_label, action, entity, entity_id, meta, ip, created_at FROM audit_logs WHERE ${where} ORDER BY id DESC LIMIT ${size} OFFSET ${offset}`;
  const [t] = await sql`SELECT count(*) FILTER (WHERE action = 'login.failed' AND created_at > now() - interval '24 hours')::int AS failed,
                               count(*) FILTER (WHERE action = 'login' AND created_at > now() - interval '24 hours')::int AS logins,
                               count(*) FILTER (WHERE category = 'security' AND created_at > now() - interval '24 hours')::int AS sec,
                               count(DISTINCT actor_id) FILTER (WHERE created_at > now() - interval '24 hours')::int AS actors
                        FROM audit_logs WHERE school_id = ${me.schoolId}`;
  return (
    <>
      <PageHeader title="Audit & security" sub="An append-only record of important activity. Entries cannot be edited or deleted."
        actions={can(me, "audit:export") && <a className="btn btn-ghost btn-sm" href="/portal/export/audit">Export CSV</a>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <Stat label="Sign-ins (24h)" value={t.logins} /><Stat label="Failed sign-ins (24h)" value={t.failed} tone="royal" />
        <Stat label="Security events (24h)" value={t.sec} /><Stat label="Active people (24h)" value={t.actors} tone="royal" />
      </div>
      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto]" role="search">
          <input name="q" defaultValue={q} className="input" placeholder="Action contains…" aria-label="Action" />
          <input name="actor" defaultValue={actor} className="input" placeholder="Actor email contains…" aria-label="Actor" />
          <select name="category" defaultValue={cat} className="select" aria-label="Category"><option value="">All</option><option value="audit">Audit</option><option value="security">Security</option></select>
          <button className="btn btn-primary">Filter</button>
        </form>
      </Card>
      {rows.length === 0 ? <Empty title="No entries" /> : (
        <div className="card overflow-x-auto">
          <table className="tbl text-xs">
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  <td className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-GB")}</td>
                  <td>{r.actor_label ?? "system"}</td>
                  <td className="font-bold">{r.action} {r.category === "security" && <Badge tone="warn">security</Badge>}</td>
                  <td>{r.entity}<br /><span className="text-muted">{String(r.entity_id ?? "").slice(0, 8)}</span></td>
                  <td className="max-w-xs break-words font-mono text-[11px] text-muted">{r.meta && Object.keys(r.meta).length ? JSON.stringify(r.meta).slice(0, 160) : ""}</td>
                  <td>{r.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={Math.ceil(n / size)} base={`/portal/audit?q=${encodeURIComponent(q)}&actor=${encodeURIComponent(actor)}&category=${cat}`} />
    </>
  );
}
