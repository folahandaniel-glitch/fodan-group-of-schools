import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requirePerm } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ACTIVITY_KINDS, KIND_LABEL, STAGES, STAGE_LABEL, STATUS_LABEL } from "@/lib/crm";
import { Badge, Card, Empty, Field, PageHeader, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addContact, completeFollowUp, createOpportunity, deleteAccount, logActivity, moveOpportunity, removeContact, updateAccount } from "../actions";

export const metadata = { title: "CRM account" };
export const dynamic = "force-dynamic";

const naira = (n: number | string) => `₦${Number(n).toLocaleString("en-NG")}`;
const d = (v: unknown) => new Date(v as string).toLocaleDateString("en-GB");
type Row = Record<string, any>;

export default async function Account({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("crm:view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [a] = await sql`SELECT a.*, u.first_name || ' ' || u.last_name AS owner FROM crm_accounts a LEFT JOIN users u ON u.id = a.owner_id WHERE a.id = ${id} AND a.school_id = ${me.schoolId}`;
  if (!a) notFound();
  const contacts: Row[] = await sql`SELECT * FROM crm_contacts WHERE account_id = ${id} ORDER BY is_primary DESC, name`;
  const opps: Row[] = await sql`SELECT * FROM crm_opportunities WHERE account_id = ${id} ORDER BY created_at DESC`;
  const acts: Row[] = await sql`SELECT x.*, u.first_name || ' ' || u.last_name AS by_name FROM crm_activities x LEFT JOIN users u ON u.id = x.by_user WHERE x.account_id = ${id} ORDER BY x.occurred_at DESC LIMIT 60`;
  const edit = can(me, "crm:edit"), create = can(me, "crm:create"), manage = can(me, "crm:manage");

  return (
    <>
      <PageHeader title={a.name} sub={`${KIND_LABEL[a.kind]} · ${STATUS_LABEL[a.status]} · owner ${a.owner ?? "—"}`} actions={<Link href="/portal/crm" className="btn btn-ghost btn-sm">← All accounts</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <Card><h2 className="text-xl">Details</h2>
            <dl className="mt-2 space-y-1 text-sm"><div><dt className="inline text-muted">Phone: </dt><dd className="inline">{a.phone ?? "—"}</dd></div><div><dt className="inline text-muted">Email: </dt><dd className="inline">{a.email ?? "—"}</dd></div>
              <div><dt className="inline text-muted">Address: </dt><dd className="inline">{a.address ?? "—"}</dd></div><div><dt className="inline text-muted">Source: </dt><dd className="inline">{a.source ?? "—"}</dd></div></dl>
            {a.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{a.notes}</p>}
            {edit && (
              <details className="mt-3 border-t border-line pt-3"><summary className="cursor-pointer font-bold text-royal">Edit account</summary>
                <ActionForm action={updateAccount} submit="Save" small className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={a.id} />
                  <Field label="Name" name="name" defaultValue={a.name} required />
                  <div className="field"><label>Type</label><select name="kind" className="select" defaultValue={a.kind}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div className="field"><label>Status</label><select name="status" className="select" defaultValue={a.status}>{Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <Field label="Phone" name="phone" defaultValue={a.phone} /><Field label="Email" name="email" type="email" defaultValue={a.email} /><Field label="Source" name="source" defaultValue={a.source} />
                  <div className="sm:col-span-2"><Field label="Address" name="address" defaultValue={a.address} /></div>
                  <div className="sm:col-span-2"><TextArea label="Notes" name="notes" rows={3} defaultValue={a.notes} /></div>
                </ActionForm></details>)}
            {manage && <form action={deleteAccount} className="mt-3"><input type="hidden" name="id" value={a.id} /><button className="btn btn-danger btn-sm">Delete account</button></form>}
          </Card>

          <Card><h2 className="text-xl">Contacts</h2>
            {contacts.length === 0 ? <p className="mt-2 text-sm text-muted">No contacts yet.</p> : (
              <ul className="mt-2 divide-y divide-line text-sm">{contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2"><span><strong>{c.name}</strong> {c.is_primary && <Badge tone="info">primary</Badge>}<br /><span className="text-muted">{[c.title, c.phone, c.email].filter(Boolean).join(" · ")}</span></span>
                  {edit && <form action={removeContact}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="account" value={a.id} /><button className="btn btn-ghost btn-sm">Remove</button></form>}</li>))}</ul>)}
            {create && <details className="mt-3 border-t border-line pt-3"><summary className="cursor-pointer font-bold text-royal">Add a contact</summary>
              <ActionForm action={addContact} submit="Add contact" small className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="account" value={a.id} />
                <Field label="Name" name="name" required /><Field label="Role / title" name="title" /><Field label="Phone" name="phone" /><Field label="Email" name="email" type="email" /></ActionForm></details>}
          </Card>
        </div>

        <div className="space-y-5">
          <Card><h2 className="text-xl">Opportunities</h2>
            {opps.length === 0 ? <p className="mt-2 text-sm text-muted">None yet. For example: an admission, a sponsorship or a supply deal.</p> : (
              <ul className="mt-3 space-y-3">{opps.map((o) => (
                <li key={o.id} className="rounded-xl border border-line p-3 text-sm">
                  <p className="font-bold">{o.title} <Badge tone={o.stage === "won" ? "ok" : o.stage === "lost" ? "bad" : "info"}>{STAGE_LABEL[o.stage]}</Badge></p>
                  <p className="text-xs text-muted">{naira(o.value)}{o.expected_close ? ` · expected ${d(o.expected_close)}` : ""}{o.lost_reason ? ` · lost: ${o.lost_reason}` : ""}</p>
                  {edit && !["won", "lost"].includes(o.stage) && (
                    <ActionForm action={moveOpportunity} submit="Move" small className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={o.id} />
                      <div className="field"><label className="sr-only">Stage</label><select name="stage" className="select !w-auto" defaultValue={o.stage}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></div>
                      <div className="field"><label className="sr-only">Reason if lost</label><input name="reason" className="input" placeholder="Reason, if lost" /></div></ActionForm>)}
                </li>))}</ul>)}
            {create && <details className="mt-3 border-t border-line pt-3"><summary className="cursor-pointer font-bold text-royal">Add an opportunity</summary>
              <ActionForm action={createOpportunity} submit="Add" small className="mt-3 grid gap-3 sm:grid-cols-3"><input type="hidden" name="account" value={a.id} />
                <Field label="Title" name="title" required /><Field label="Value (₦)" name="value" type="number" /><Field label="Expected close" name="expected" type="date" /></ActionForm></details>}
          </Card>

          <Card><h2 className="text-xl">Activity</h2>
            {create && (
              <ActionForm action={logActivity} submit="Log activity" small className="mt-3 grid gap-3 sm:grid-cols-2"><input type="hidden" name="account" value={a.id} />
                <div className="field"><label htmlFor="ak">Type</label><select id="ak" name="kind" className="select">{ACTIVITY_KINDS.map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}</select></div>
                <Field label="Follow up on" name="followUp" type="date" />
                <div className="sm:col-span-2"><TextArea label="What was discussed" name="summary" rows={2} required /></div>
                {opps.length > 0 && <div className="field sm:col-span-2"><label htmlFor="ao">About opportunity (optional)</label><select id="ao" name="opportunity" className="select"><option value="">—</option>{opps.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select></div>}
              </ActionForm>)}
            {acts.length === 0 ? <div className="mt-3"><Empty title="Nothing logged yet" /></div> : (
              <ul className="mt-4 divide-y divide-line text-sm">{acts.map((x) => (
                <li key={x.id} className="py-2"><p><Badge>{x.kind}</Badge> {x.summary}</p>
                  <p className="text-xs text-muted">{x.by_name ?? "—"} · {d(x.occurred_at)}{x.follow_up_on && ` · follow up ${d(x.follow_up_on)}${x.follow_up_done ? " (done)" : ""}`}</p>
                  {x.follow_up_on && !x.follow_up_done && edit && <form action={completeFollowUp} className="mt-1"><input type="hidden" name="id" value={x.id} /><input type="hidden" name="account" value={a.id} /><button className="btn btn-ghost btn-sm">Mark follow-up done</button></form>}</li>))}</ul>)}
          </Card>
        </div>
      </div>
    </>
  );
}
