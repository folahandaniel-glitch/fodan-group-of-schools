import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { listClasses } from "@/lib/data";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { smsConfigured } from "@/lib/sms";
import { redirect } from "next/navigation";
import { Badge, Card, Empty, PageHeader, Stat, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { sendMessage, sendQueued } from "./actions";

export const metadata = { title: "SMS" };
export const dynamic = "force-dynamic";

export default async function Sms() {
  const me = await requireMe();
  if (!can(me, "sms:manage")) redirect("/forbidden");
  const live = smsConfigured();
  const scope = wideScope(me) ? null : await teacherClassIds(me.id);
  const classes = (await listClasses(me.schoolId)).filter((c) => !scope || scope.includes(c.id));
  const rows = await sql`SELECT id, to_phone, body, status, error, created_at FROM sms_outbox WHERE school_id = ${me.schoolId} ORDER BY created_at DESC LIMIT 100`;
  const [c] = await sql`SELECT count(*) FILTER (WHERE status = 'sent')::int AS sent, count(*) FILTER (WHERE status = 'queued')::int AS queued, count(*) FILTER (WHERE status = 'failed')::int AS failed FROM sms_outbox WHERE school_id = ${me.schoolId}`;

  return (
    <>
      <PageHeader title="SMS" sub="Text parents, staff or any numbers. Guardian numbers come from each student's record." />
      {!live && <p className="mb-5 rounded-xl border border-gold-2 bg-gold-soft px-4 py-3 text-sm font-semibold">No SMS provider is connected yet, so messages are saved as <b>queued</b> and not sent. Add <code>TERMII_API_KEY</code> and <code>SMS_SENDER_ID</code> (a Termii account and approved sender name) in the project settings, then press &ldquo;Send queued messages&rdquo;.</p>}
      <section className="mb-5 grid grid-cols-3 gap-3"><Stat label="Sent" value={c.sent} /><Stat label="Queued" value={c.queued} tone="royal" /><Stat label="Failed" value={c.failed} /></section>
      <div className="mb-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card><h2 className="text-xl">New message</h2>
          <ActionForm action={sendMessage} submit={live ? "Send" : "Queue message"} className="mt-3 grid gap-3">
            <div className="field"><label htmlFor="aud">To</label><select id="aud" name="audience" className="select"><option value="class">Parents of a class</option>{!scope && <option value="all_parents">All parents</option>}<option value="staff">All staff</option><option value="numbers">Numbers I type</option></select></div>
            <div className="field"><label htmlFor="cl">Class (for “Parents of a class”)</label><select id="cl" name="class" className="select"><option value="">Choose…</option>{classes.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></div>
            <TextArea label="Numbers (for “Numbers I type”): separate with commas or spaces" name="numbers" rows={2} />
            <TextArea label="Message (up to 480 characters; 160 per text)" name="body" rows={4} required />
          </ActionForm></Card>
        <Card><h2 className="text-xl">Queued messages</h2>
          <p className="mt-1 text-sm text-muted">Send everything waiting, or retry failed ones.</p>
          <ActionForm action={sendQueued} submit="Send queued messages" small className="mt-3"><span /></ActionForm></Card>
      </div>
      <Card pad={false} className="overflow-x-auto">
        {rows.length === 0 ? <div className="p-5"><Empty title="No messages yet" /></div> : (
          <table className="tbl min-w-[40rem] text-sm"><thead><tr><th>When</th><th>To</th><th>Message</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td className="whitespace-nowrap">{new Date(r.created_at as string).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Lagos" })}</td><td>{r.to_phone}</td><td className="max-w-xs truncate">{r.body}</td>
                <td><Badge tone={r.status === "sent" ? "ok" : r.status === "failed" ? "bad" : "warn"}>{r.status}</Badge>{r.error && <span className="block text-xs text-muted">{r.error}</span>}</td></tr>))}</tbody></table>)}
      </Card>
    </>
  );
}
