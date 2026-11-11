import Link from "next/link";
import { can, requirePerm } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { KIND_LABEL, STAGES, STAGE_LABEL, STATUS_LABEL } from "@/lib/crm";
import { Badge, Card, Empty, Field, PageHeader, Stat, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { advanceOpportunity, completeFollowUp, createAccount } from "./actions";

export const metadata = { title: "CRM" };
export const dynamic = "force-dynamic";

const naira = (n: number | string) => `₦${Number(n).toLocaleString("en-NG")}`;
type Row = Record<string, any>;

export default async function Crm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePerm("crm:view");
  const sp = await searchParams;
  const S = me.schoolId;
  const q = str(sp.q).trim().slice(0, 80), status = str(sp.status), kind = str(sp.kind);
  const edit = can(me, "crm:edit"), create = can(me, "crm:create");

  const opps: Row[] = await sql`SELECT o.id, o.title, o.stage, o.value, o.account_id, a.name AS account FROM crm_opportunities o JOIN crm_accounts a ON a.id = o.account_id
    WHERE o.school_id = ${S} AND (o.stage NOT IN ('won','lost') OR o.closed_at > now() - interval '30 days') ORDER BY o.value DESC LIMIT 300`;
  const accounts: Row[] = await sql`
    SELECT a.id, a.name, a.kind, a.status, a.phone, u.first_name || ' ' || u.last_name AS owner,
      (SELECT coalesce(sum(o.value), 0) FROM crm_opportunities o WHERE o.account_id = a.id AND o.stage NOT IN ('won','lost')) AS open_value,
      (SELECT min(x.follow_up_on) FROM crm_activities x WHERE x.account_id = a.id AND x.follow_up_on IS NOT NULL AND NOT x.follow_up_done) AS next_fu
    FROM crm_accounts a LEFT JOIN users u ON u.id = a.owner_id WHERE a.school_id = ${S}
      ${status ? sql`AND a.status = ${status}` : sql``} ${kind ? sql`AND a.kind = ${kind}` : sql``}
      ${q ? sql`AND (a.name ILIKE ${"%" + q.replace(/[%_\\]/g, "") + "%"} OR a.email ILIKE ${"%" + q.replace(/[%_\\]/g, "") + "%"} OR a.phone ILIKE ${"%" + q.replace(/[%_\\]/g, "") + "%"})` : sql``}
    ORDER BY a.created_at DESC LIMIT 200`;
  const due: Row[] = await sql`SELECT x.id, x.summary, x.follow_up_on, a.id AS account_id, a.name AS account FROM crm_activities x JOIN crm_accounts a ON a.id = x.account_id
    WHERE x.school_id = ${S} AND x.follow_up_on IS NOT NULL AND NOT x.follow_up_done AND x.follow_up_on <= current_date ORDER BY x.follow_up_on LIMIT 20`;

  const cols = STAGES.map((s) => { const items = opps.filter((o) => o.stage === s); return { s, items, total: items.reduce((a, o) => a + Number(o.value), 0) }; });
  const won = cols.find((c) => c.s === "won")!.total, lost = cols.find((c) => c.s === "lost")!.total;
  const open = cols.filter((c) => !["won", "lost"].includes(c.s)).reduce((a, c) => a + c.total, 0);

  return (
    <>
      <PageHeader title="CRM" sub="Admissions enquiries, sponsors, vendors and partners: who they are, what was discussed and what happens next." />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open pipeline" value={naira(open)} /><Stat label="Win rate (30 days)" value={won + lost > 0 ? `${Math.round((won / (won + lost)) * 100)}%` : "—"} tone="royal" />
        <Stat label="Follow-ups due" value={due.length} /><Stat label="Accounts" value={accounts.length} tone="royal" />
      </section>

      {due.length > 0 && (
        <Card className="mb-6"><h2 className="text-xl">Follow-ups due</h2>
          <ul className="mt-2 divide-y divide-line text-sm">{due.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><Link className="font-bold text-royal" href={`/portal/crm/${d.account_id}`}>{d.account}</Link> · {d.summary} <span className="text-muted">({new Date(d.follow_up_on).toLocaleDateString("en-GB")})</span></span>
              {edit && <form action={completeFollowUp}><input type="hidden" name="id" value={d.id} /><button className="btn btn-ghost btn-sm">Done</button></form>}
            </li>))}</ul></Card>
      )}

      <section aria-label="Pipeline" className="-mx-4 mb-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="grid min-w-[72rem] grid-cols-7 gap-3">
          {cols.map((c) => (
            <div key={c.s} className="rounded-2xl bg-paper-2 p-2">
              <div className="mb-2 flex items-baseline justify-between px-1"><h3 className="text-sm font-bold">{STAGE_LABEL[c.s]}</h3><span className="text-xs text-muted">{c.items.length}</span></div>
              <ul className="space-y-2">{c.items.map((o) => (
                <li key={o.id} className="card !p-3 text-sm"><Link href={`/portal/crm/${o.account_id}`} className="font-bold text-royal">{o.account}</Link>
                  <p className="text-xs text-muted">{o.title}</p><p className="mt-1 font-bold">{naira(o.value)}</p>
                  {edit && !["won", "lost"].includes(c.s) && <form action={advanceOpportunity} className="mt-2"><input type="hidden" name="id" value={o.id} /><button className="btn btn-ghost btn-sm">Next stage →</button></form>}
                </li>))}</ul>
              {c.items.length === 0 && <p className="px-1 py-3 text-xs text-muted">Empty</p>}
              <p className="mt-2 px-1 text-xs font-bold">{naira(c.total)}</p>
            </div>))}
        </div>
      </section>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">Accounts</h2>
          <form className="flex flex-wrap gap-2" role="search">
            <input name="q" defaultValue={q} className="input !w-52" placeholder="Search name, email, phone" aria-label="Search accounts" />
            <select name="kind" defaultValue={kind} className="select !w-auto" aria-label="Type"><option value="">All types</option>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <select name="status" defaultValue={status} className="select !w-auto" aria-label="Status"><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <button className="btn btn-ghost btn-sm">Filter</button>
          </form></div>
        {accounts.length === 0 ? <div className="mt-3"><Empty title="No accounts yet">Add your first enquiry, sponsor or partner below.</Empty></div> : (
          <div className="mt-3 overflow-x-auto"><table className="tbl min-w-[40rem]"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Owner</th><th className="text-right">Open value</th><th>Next follow-up</th></tr></thead>
            <tbody>{accounts.map((a) => (
              <tr key={a.id}><td className="font-bold"><Link className="text-royal" href={`/portal/crm/${a.id}`}>{a.name}</Link></td><td>{KIND_LABEL[a.kind]}</td>
                <td><Badge tone={a.status === "client" ? "ok" : a.status === "inactive" ? "bad" : "info"}>{STATUS_LABEL[a.status]}</Badge></td><td>{a.owner ?? "—"}</td>
                <td className="text-right">{naira(a.open_value)}</td><td>{a.next_fu ? new Date(a.next_fu).toLocaleDateString("en-GB") : "—"}</td></tr>))}</tbody></table></div>)}
      </Card>

      {create && (
        <Card><h2 className="text-xl">Add an account</h2>
          <ActionForm action={createAccount} submit="Add account" className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Name" name="name" required />
            <div className="field"><label htmlFor="kind2">Type</label><select id="kind2" name="kind" className="select">{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="field"><label htmlFor="status2">Status</label><select id="status2" name="status" className="select"><option value="lead">Lead</option><option value="prospect">Prospect</option><option value="client">Client</option></select></div>
            <Field label="Phone" name="phone" type="tel" /><Field label="Email" name="email" type="email" /><Field label="How did they find us?" name="source" />
            <Field label="Contact person" name="contact" /><Field label="Contact phone" name="cphone" type="tel" /><Field label="Address" name="address" />
            <div className="sm:col-span-3"><TextArea label="Notes" name="notes" rows={2} /></div>
          </ActionForm></Card>
      )}
    </>
  );
}
