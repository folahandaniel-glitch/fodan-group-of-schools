import { redirect } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Badge, Card, Empty, Field, PageHeader, Stat, TextArea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { DEFAULT_LEAVE_TYPES } from "@/lib/logic/hr";
import { HrNav } from "../hr-nav";
import { cancelMyLeave, decideLeave, requestLeave, saveLeaveType } from "../actions2";

export const metadata = { title: "Leave" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;
const d = (x: unknown) => new Date(x as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export default async function Leave() {
  const me = await requireMe();
  if (["student", "parent"].includes(me.role)) redirect("/portal");
  const hr = can(me, "hrm:manage") || can(me, "hrm:review"), S = me.schoolId, year = new Date().getFullYear();
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM hr_leave_types WHERE school_id = ${S}`;
  if (n === 0) for (const t of DEFAULT_LEAVE_TYPES) await sql`INSERT INTO hr_leave_types (school_id, name, days, paid) VALUES (${S}, ${t.name}, ${t.days}, ${t.paid}) ON CONFLICT DO NOTHING`;
  const types: Row[] = await sql`SELECT id, name, days, paid FROM hr_leave_types WHERE school_id = ${S} AND active ORDER BY paid DESC, name`;
  const used: Row[] = await sql`SELECT type_id, status, COALESCE(sum(days), 0)::int AS days FROM hr_leave WHERE user_id = ${me.id} AND status IN ('approved','pending') AND extract(year FROM from_on) = ${year} GROUP BY type_id, status`;
  const mine: Row[] = await sql`SELECT l.id, l.from_on, l.to_on, l.days, l.status, l.comment, t.name AS type FROM hr_leave l JOIN hr_leave_types t ON t.id = l.type_id WHERE l.user_id = ${me.id} ORDER BY l.from_on DESC LIMIT 30`;
  const pending: Row[] = hr ? await sql`SELECT l.id, l.from_on, l.to_on, l.days, l.reason, t.name AS type, u.first_name || ' ' || u.last_name AS who FROM hr_leave l JOIN hr_leave_types t ON t.id = l.type_id JOIN users u ON u.id = l.user_id
    WHERE l.school_id = ${S} AND l.status = 'pending' ORDER BY l.from_on LIMIT 100` : [];
  const away: Row[] = hr ? await sql`SELECT l.from_on, l.to_on, t.name AS type, u.first_name || ' ' || u.last_name AS who FROM hr_leave l JOIN hr_leave_types t ON t.id = l.type_id JOIN users u ON u.id = l.user_id
    WHERE l.school_id = ${S} AND l.status = 'approved' AND l.to_on >= current_date AND l.from_on <= current_date + 30 ORDER BY l.from_on LIMIT 60` : [];
  const bal = (t: Row) => { const a = used.filter((u) => u.type_id === t.id), ap = a.find((x) => x.status === "approved")?.days ?? 0, pe = a.find((x) => x.status === "pending")?.days ?? 0; return { ap, pe, left: t.days > 0 ? Math.max(0, t.days - ap - pe) : null }; };

  return (
    <>
      <PageHeader title="Leave" sub="Request time off, see your balance and get approval. Weekends and public holidays are not counted." />
      <HrNav current="/portal/hrm/leave" />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{types.slice(0, 4).map((t) => { const b = bal(t); return <Stat key={t.id} label={t.name} value={b.left === null ? "Open" : `${b.left} left`} hint={`${b.ap} taken, ${b.pe} waiting, of ${t.days || "no limit"}`} tone={t.paid ? undefined : "royal"} />; })}</section>
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card><h2 className="text-xl">Request leave</h2>
          <ActionForm action={requestLeave} submit="Send request" className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="field sm:col-span-2"><label htmlFor="lt">Type of leave</label><select id="lt" name="type" className="select" required><option value="">Choose…</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name} {t.days ? `(${t.days} days a year)` : ""}</option>)}</select></div>
            <Field label="From" name="from" type="date" required /><Field label="To" name="to" type="date" required />
            <div className="sm:col-span-2"><TextArea label="Reason (optional)" name="reason" rows={2} /></div>
          </ActionForm></Card>
        <Card><h2 className="text-xl">My requests</h2>
          {mine.length === 0 ? <div className="mt-3"><Empty title="No leave requests yet" /></div> : (
            <ul className="mt-3 divide-y divide-line text-sm">{mine.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{l.type}</b> · {d(l.from_on)} to {d(l.to_on)} · {l.days} day{l.days === 1 ? "" : "s"}{l.comment && <span className="block text-xs text-muted">{l.comment}</span>}</span>
                <span className="flex items-center gap-2"><Badge tone={l.status === "approved" ? "ok" : l.status === "pending" ? "warn" : "bad"}>{l.status}</Badge>
                  {l.status === "pending" && <form action={cancelMyLeave}><input type="hidden" name="id" value={l.id} /><button className="btn btn-ghost btn-sm">Cancel</button></form>}</span></li>))}</ul>)}
        </Card>
      </div>

      {hr && (
        <>
          <Card className="mb-5"><h2 className="text-xl">Waiting for approval {pending.length > 0 && <Badge tone="warn">{pending.length}</Badge>}</h2>
            {pending.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing waiting.</p> : (
              <ul className="mt-3 divide-y divide-line text-sm">{pending.map((l) => (
                <li key={l.id} className="py-3"><p><b>{l.who}</b> · {l.type} · {d(l.from_on)} to {d(l.to_on)} · {l.days} day{l.days === 1 ? "" : "s"}</p>{l.reason && <p className="text-xs text-muted">{l.reason}</p>}
                  <form action={decideLeave} className="mt-2 flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={l.id} /><input name="comment" className="input !w-64" placeholder="Comment (optional)" aria-label="Comment" />
                    <button name="op" value="approve" className="btn btn-gold btn-sm">Approve</button><button name="op" value="reject" className="btn btn-danger btn-sm">Reject</button></form></li>))}</ul>)}
          </Card>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><h2 className="text-xl">Away now and in the next 30 days</h2>
              {away.length === 0 ? <p className="mt-2 text-sm text-muted">Nobody is booked off.</p> : <ul className="mt-2 divide-y divide-line text-sm">{away.map((l, i) => <li key={i} className="py-2"><b>{l.who}</b> · {l.type} · {d(l.from_on)} to {d(l.to_on)}</li>)}</ul>}</Card>
            <Card><h2 className="text-xl">Leave types</h2>
              <ul className="mt-2 text-sm">{types.map((t) => <li key={t.id}>{t.name}: {t.days || "no limit"} days {t.paid ? "(paid)" : "(unpaid)"}</li>)}</ul>
              <ActionForm action={saveLeaveType} submit="Save leave type" small className="mt-3 grid gap-2 sm:grid-cols-3"><Field label="Name" name="name" required /><Field label="Days a year (0 = no limit)" name="days" type="number" defaultValue="0" />
                <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="paid" defaultChecked /> Paid</label></ActionForm></Card>
          </div>
        </>)}
    </>
  );
}
