import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str, listClasses } from "@/lib/data";
import { decrypt } from "@/lib/crypto";
import { audit } from "@/lib/security";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { allSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { Badge, Card, Empty, Field, PageHeader, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { PrintButton } from "@/components/print-button";
import { bulkCodes, codeRow } from "./actions";

export const metadata = { title: "Student access codes" };
export const dynamic = "force-dynamic";
type Row = Record<string, any>;

export default async function AccessCodes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  if (!can(me, "access_codes:view") && !can(me, "access_codes:manage")) redirect("/forbidden");
  const manage = can(me, "access_codes:manage");
  const sp = await searchParams;
  const cls = str(sp.class), status = str(sp.status), q = str(sp.q).trim().slice(0, 60), print = str(sp.print) === "1";
  const scope = wideScope(me) ? null : await teacherClassIds(me.id);
  const classes = (await listClasses(me.schoolId)).filter((c) => !scope || scope.includes(c.id));
  const like = "%" + q.replace(/[%_\\]/g, "") + "%";
  const rows: Row[] = await sql`
    SELECT s.id, s.admission_no, s.first_name, s.last_name, s.code_enc, s.code_status, s.user_id, c.name AS class_name, c.arm
    FROM students s LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.school_id = ${me.schoolId} AND s.status IN ('active','enrolled')
      ${/^[0-9a-f-]{36}$/i.test(cls) ? sql`AND s.class_id = ${cls}` : sql``} ${scope ? sql`AND s.class_id = ANY(${scope})` : sql``}
      ${status === "unused" ? sql`AND s.user_id IS NULL AND s.code_enc IS NOT NULL` : status === "used" ? sql`AND s.user_id IS NOT NULL` : status === "none" ? sql`AND s.code_enc IS NULL` : ["revoked", "suspended"].includes(status) ? sql`AND s.code_status = ${status}` : sql``}
      ${q ? sql`AND (s.first_name ILIKE ${like} OR s.last_name ILIKE ${like} OR s.admission_no ILIKE ${like})` : sql``}
    ORDER BY c.name, c.arm, s.last_name, s.first_name LIMIT 600`;
  const view: Row[] = rows.map((r) => ({ ...r, code: r.code_enc ? (() => { try { return decrypt(r.code_enc as string); } catch { return ""; } })() : "" }));
  if (view.length) await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: print ? "access_code.print" : "access_code.list", entity: "student", meta: { rows: view.length } });
  const [{ none }] = await sql`SELECT count(*)::int AS none FROM students WHERE school_id = ${me.schoolId} AND status IN ('active','enrolled') AND code_enc IS NULL`;
  const brand = (await allSettings()).brand as { school: string };
  const base = (process.env.APP_BASE_URL ?? "https://fodan-group-of-schools.vercel.app").replace(/\/$/, "");
  const label = (r: Row) => (r.class_name ? `${r.class_name}${r.arm ?? ""}` : "No class");
  const qs = (o: Record<string, string>) => `/portal/access-codes?${new URLSearchParams({ ...(cls ? { class: cls } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}), ...o })}`;

  if (print) {
    return (
      <>
        <div className="no-print mb-4 flex flex-wrap items-center gap-2"><Link href={qs({})} className="btn btn-ghost btn-sm">← Back</Link><PrintButton label="Print code slips" />
          <span className="text-sm text-muted">{view.length} slips. Cut along the lines and hand each to the student or parent. Keep the printout safe.</span></div>
        <div className="grid grid-cols-2 gap-3 print:gap-2">
          {view.filter((r) => r.code && r.code_status === "active").map((r) => (
            <div key={r.id} className="break-inside-avoid rounded-2xl border-2 border-dashed border-line p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">{brand.school}</p>
              <p className="mt-1 font-display text-lg leading-tight">{r.first_name} {r.last_name}</p>
              <p className="text-sm text-muted">{label(r)} · Admission no. {r.admission_no}</p>
              <p className="mt-2 rounded-xl bg-paper-2 px-3 py-2 text-center font-mono text-lg font-bold tracking-wider">{r.code}</p>
              <p className="mt-2 text-xs text-muted">Students: register at <b>{base}/register</b> with this code. Parents: register at <b>{base}/register/parent</b>, then add your child with this code, the admission number and the date of birth.</p>
            </div>))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Student access codes" sub="Every student has a unique code. Students use it to activate their account; parents use it, with the admission number and date of birth, to link their child."
        actions={<>
          <Link className="btn btn-gold" href={qs({ print: "1" })}>Print code slips</Link>
          <a className="btn btn-ghost" href={`/portal/export/access-codes${/^[0-9a-f-]{36}$/i.test(cls) ? `?class=${cls}` : ""}`}>Download Excel</a></>} />

      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" role="search">
          <div className="field"><label htmlFor="class">Class</label><select id="class" name="class" defaultValue={cls} className="select"><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div className="field"><label htmlFor="status">Code</label><select id="status" name="status" defaultValue={status} className="select"><option value="">Any</option><option value="unused">Not yet used</option><option value="used">Activated</option><option value="none">No code yet</option><option value="revoked">Revoked</option><option value="suspended">Suspended</option></select></div>
          <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} className="input" placeholder="Name or admission number" /></div>
          <button className="btn btn-primary self-end">Filter</button>
        </form>
      </Card>

      {manage && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Card><h2 className="text-xl">Issue codes to students without one</h2>
            <p className="mt-1 text-sm text-muted">{none > 0 ? `${none} student${none === 1 ? " has" : "s have"} no code.` : "Every student already has a code."}</p>
            <ActionForm action={bulkCodes} submit="Generate missing codes" small className="mt-3"><input type="hidden" name="mode" value="missing" /></ActionForm></Card>
          <Card><h2 className="text-xl">Replace a whole class&apos;s codes</h2>
            <p className="mt-1 text-sm text-muted">New codes for every student in a class. Old codes stop working. Students who already activated keep their accounts.</p>
            <ActionForm action={bulkCodes} submit="Replace codes" small danger className="mt-3 grid gap-2"><input type="hidden" name="mode" value="class" />
              <div className="field"><label htmlFor="bc">Class</label><select id="bc" name="class" className="select" required><option value="">Choose…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" /> I understand the old codes will stop working.</label></ActionForm></Card>
        </div>
      )}

      <Card pad={false} className="overflow-x-auto">
        {view.length === 0 ? <div className="p-5"><Empty title="No students match" /></div> : (
          <table className="tbl min-w-[44rem] text-sm"><thead><tr><th>Student</th><th>Class</th><th>Access code</th><th>Status</th><th>Account</th>{manage && <th></th>}</tr></thead>
            <tbody>{view.map((r) => (
              <tr key={r.id}><td><Link className="font-bold text-royal" href={`/portal/students/${r.id}`}>{r.last_name}, {r.first_name}</Link><br /><span className="text-xs text-muted">{r.admission_no}</span></td>
                <td>{label(r)}</td>
                <td className="font-mono font-bold tracking-wide">{can(me, "access_codes:view") ? (r.code || <span className="font-sans font-normal text-muted">none</span>) : "••••"}</td>
                <td>{r.code_enc ? <Badge tone={statusTone(r.code_status)}>{r.code_status}</Badge> : <Badge tone="warn">no code</Badge>}</td>
                <td>{r.user_id ? <Badge tone="ok">Activated</Badge> : <span className="text-muted">Not yet</span>}</td>
                {manage && (
                  <td className="whitespace-nowrap">
                    <form action={codeRow} className="inline"><input type="hidden" name="id" value={r.id} />
                      {!r.code_enc ? <button name="op" value="generate" className="btn btn-gold btn-sm">Generate</button> : <button name="op" value="regenerate" className="btn btn-ghost btn-sm">New code</button>}
                      {r.code_enc && (r.code_status === "active" ? <button name="op" value="revoke" className="btn btn-danger btn-sm ml-1">Revoke</button> : <button name="op" value="restore" className="btn btn-ghost btn-sm ml-1">Restore</button>)}
                    </form></td>)}
              </tr>))}</tbody></table>)}
      </Card>
      <p className="mt-3 text-xs text-muted">Every time codes are shown, printed or issued, it is recorded in the audit log.{rows.length === 600 ? " Showing the first 600; filter by class to see more." : ""}</p>
    </>
  );
}
