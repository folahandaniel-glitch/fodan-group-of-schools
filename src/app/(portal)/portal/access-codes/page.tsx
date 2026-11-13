import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { decrypt } from "@/lib/crypto";
import { audit } from "@/lib/security";
import { allSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PrintButton } from "@/components/print-button";
import { codeOp, decideRegistration, makeCodes } from "./actions";

export const metadata = { title: "Access codes" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export default async function AccessCodes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "access_codes:view") && !can(me, "access_codes:manage")) redirect("/forbidden");
  const manage = can(me, "access_codes:manage");
  const sp = await searchParams;
  const kind = ["student", "parent"].includes(str(sp.kind)) ? str(sp.kind) : "", status = str(sp.status), batch = str(sp.batch).trim().slice(0, 40), print = str(sp.print) === "1";
  const lagosToday = new Date(Date.now() + 3600_000).toISOString().slice(0, 10);

  const rows: Row[] = await sql`
    SELECT a.id, a.kind, a.code_enc, a.batch, a.status, a.used_at, to_char(a.valid_from, 'YYYY-MM-DD') AS valid_from, to_char(a.expires_on, 'YYYY-MM-DD') AS expires_on,
           u.first_name || ' ' || u.last_name AS used_by_name, u.status AS user_status
    FROM access_codes a LEFT JOIN users u ON u.id = a.used_by
    WHERE a.school_id = ${me.schoolId} ${kind ? sql`AND a.kind = ${kind}` : sql``} ${batch ? sql`AND a.batch = ${batch}` : sql``}
      ${status === "unused" ? sql`AND a.used_at IS NULL AND a.status = 'active' AND (a.expires_on IS NULL OR a.expires_on >= ${lagosToday})`
        : status === "used" ? sql`AND a.used_at IS NOT NULL` : status === "expired" ? sql`AND a.used_at IS NULL AND a.expires_on < ${lagosToday}`
        : status === "revoked" ? sql`AND a.status = 'revoked'` : sql``}
    ORDER BY a.created_at DESC, a.kind LIMIT 500`;
  const view: Row[] = rows.map((r) => ({ ...r, code: (() => { try { return decrypt(r.code_enc as string); } catch { return ""; } })() }));
  const state = (r: Row) => r.used_at ? "used" : r.status === "revoked" ? "revoked" : r.expires_on && r.expires_on < lagosToday ? "expired" : r.valid_from && r.valid_from > lagosToday ? "not yet valid" : "unused";
  if (view.length) await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: print ? "access_code.print" : "access_code.list", entity: "access_code", meta: { rows: view.length } });
  const pending: Row[] = manage ? await sql`
    SELECT u.id, u.role, u.first_name, u.last_name, u.email, u.phone, u.created_at, s.admission_no, c.name AS class_name, c.arm
    FROM users u LEFT JOIN students s ON s.user_id = u.id LEFT JOIN classes c ON c.id = s.class_id
    WHERE u.school_id = ${me.schoolId} AND u.status = 'pending' AND u.role IN ('student','parent') ORDER BY u.created_at` : [];
  const brand = (await allSettings()).brand as { school: string };
  const base = (process.env.APP_BASE_URL ?? "https://fodan-group-of-schools.vercel.app").replace(/\/$/, "");
  const qs = (o: Record<string, string>) => `/portal/access-codes?${new URLSearchParams({ ...(kind ? { kind } : {}), ...(status ? { status } : {}), ...(batch ? { batch } : {}), ...o })}`;

  if (print) {
    const slips = view.filter((r) => state(r) === "unused");
    return (
      <>
        <div className="no-print mb-4 flex flex-wrap items-center gap-2"><Link href={qs({ print: "" })} className="btn btn-ghost btn-sm">← Back</Link><PrintButton label="Print code slips" />
          <span className="text-sm text-muted">{slips.length} unused codes. Cut along the lines. Each code works once. Keep the printout safe.</span></div>
        <div className="grid grid-cols-2 gap-3 print:gap-2">
          {slips.map((r) => (
            <div key={r.id} className="break-inside-avoid rounded-2xl border-2 border-dashed border-line p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">{brand.school} · {r.kind === "parent" ? "Parent" : "Student"} access code</p>
              <p className="mt-2 rounded-xl bg-paper-2 px-3 py-2 text-center font-mono text-lg font-bold tracking-wider">{r.code}</p>
              {(r.valid_from || r.expires_on) && <p className="mt-1 text-xs font-semibold">Valid {r.valid_from ? `from ${r.valid_from} ` : ""}{r.expires_on ? `until ${r.expires_on}` : ""}{r.batch ? ` · Batch ${r.batch}` : ""}</p>}
              {!(r.valid_from || r.expires_on) && r.batch && <p className="mt-1 text-xs font-semibold">Batch {r.batch}</p>}
              <p className="mt-2 text-xs text-muted">Register at <b>{base}{r.kind === "parent" ? "/register/parent" : "/register"}</b> with this code. It can be used once. After registering, the school will activate your account.</p>
            </div>))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Access codes" sub="Codes let students and parents register. Each code works once, for any class. After registering, the account waits for the school to approve it."
        actions={<><Link className="btn btn-gold" href={qs({ print: "1", status: status || "unused" })}>Print unused codes</Link><Link className="btn btn-ghost" href="/portal/access-codes/individual">Individual student codes</Link></>} />

      {manage && (
        <Card className="mb-5" id="generate"><h2 className="text-xl">Generate codes</h2>
          <ActionForm action={makeCodes} submit="Generate codes" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="field"><label htmlFor="kind">For</label><select id="kind" name="kind" className="select"><option value="student">Students</option><option value="parent">Parents</option></select></div>
            <Field label="How many" name="count" type="number" defaultValue="10" min={1} max={300} required />
            <Field label="Valid until (optional)" name="expiresOn" type="date" />
            <Field label="Batch no. (optional)" name="batch" placeholder="e.g. 2026-A" />
            <Field label="Valid from (optional)" name="validFrom" type="date" />
          </ActionForm></Card>
      )}

      {manage && (
        <Card className="mb-5" id="pending"><h2 className="text-xl">Waiting for approval {pending.length > 0 && <Badge tone="warn">{pending.length}</Badge>}</h2>
          <p className="mt-1 text-sm text-muted">These people registered successfully. They cannot sign in or see anything until you approve them.</p>
          {pending.length === 0 ? <p className="mt-3 text-sm text-muted">Nobody is waiting.</p> : (
            <>
              <form action={decideRegistration} className="mt-3"><button name="op" value="approve-all" className="btn btn-gold btn-sm">Approve everyone ({pending.length})</button></form>
              <div className="mt-3 overflow-x-auto"><table className="tbl min-w-[36rem] text-sm"><thead><tr><th>Name</th><th>Type</th><th>Class</th><th>Email / phone</th><th></th></tr></thead>
                <tbody>{pending.map((p) => (
                  <tr key={p.id}><td className="font-bold">{p.first_name} {p.last_name}</td><td>{p.role}</td><td>{p.class_name ? `${p.class_name}${p.arm ?? ""}` : "-"}</td><td>{p.email}<br /><span className="text-xs text-muted">{p.phone}</span></td>
                    <td className="whitespace-nowrap"><form action={decideRegistration} className="inline"><input type="hidden" name="id" value={p.id} />
                      <button name="op" value="approve" className="btn btn-gold btn-sm">Approve</button> <button name="op" value="reject" className="btn btn-danger btn-sm">Reject</button></form></td></tr>))}</tbody></table></div>
            </>)}
        </Card>
      )}

      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" role="search">
          <div className="field"><label htmlFor="fk">Type</label><select id="fk" name="kind" defaultValue={kind} className="select"><option value="">All</option><option value="student">Students</option><option value="parent">Parents</option></select></div>
          <div className="field"><label htmlFor="fs">Code</label><select id="fs" name="status" defaultValue={status} className="select"><option value="">Any</option><option value="unused">Unused</option><option value="used">Used</option><option value="expired">Expired</option><option value="revoked">Revoked</option></select></div>
          <div className="field"><label htmlFor="fb">Batch no.</label><input id="fb" name="batch" defaultValue={batch} className="input" placeholder="Any" /></div>
          <button className="btn btn-primary self-end">Filter</button>
        </form>
      </Card>

      <Card pad={false} className="overflow-x-auto">
        {view.length === 0 ? <div className="p-5"><Empty title="No codes yet">Generate some above.</Empty></div> : (
          <table className="tbl min-w-[46rem] text-sm"><thead><tr><th>Code</th><th>For</th><th>Batch</th><th>Valid</th><th>Status</th><th>Used by</th>{manage && <th></th>}</tr></thead>
            <tbody>{view.map((r) => { const st = state(r); return (
              <tr key={r.id}><td className="font-mono font-bold tracking-wide">{can(me, "access_codes:view") ? r.code : "••••"}</td><td className="capitalize">{r.kind}</td><td>{r.batch ?? <span className="text-muted">-</span>}</td>
                <td className="whitespace-nowrap text-xs">{r.valid_from || r.expires_on ? `${r.valid_from ?? "any time"} to ${r.expires_on ?? "no end"}` : <span className="text-muted">No limit</span>}</td>
                <td><Badge tone={st === "unused" ? "ok" : st === "used" ? "info" : "bad"}>{st}</Badge></td>
                <td>{r.used_by_name ?? <span className="text-muted">-</span>}{r.used_by_name && r.user_status === "pending" && <span className="ml-1 text-xs text-muted">(waiting for approval)</span>}</td>
                {manage && <td className="whitespace-nowrap"><form action={codeOp} className="inline"><input type="hidden" name="id" value={r.id} />
                  {!r.used_at && (r.status === "active" ? <button name="op" value="revoke" className="btn btn-ghost btn-sm">Revoke</button> : <button name="op" value="restore" className="btn btn-ghost btn-sm">Restore</button>)}
                  {!r.used_at && <button name="op" value="delete" className="btn btn-danger btn-sm ml-1">Delete</button>}</form></td>}
              </tr>); })}</tbody></table>)}
      </Card>
      <p className="mt-3 text-xs text-muted">Every time codes are shown, printed or issued, it is recorded in the audit log.{rows.length === 500 ? " Showing the newest 500; filter to see others." : ""}</p>
    </>
  );
}
