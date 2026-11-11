import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { allSettings } from "@/lib/settings";
import { audit } from "@/lib/security";
import { Empty, Logo, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Payslips" };
export const dynamic = "force-dynamic";
const ngn = (n: unknown) => `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
type Row = Record<string, any>;

/** Staff see only their own payslips. Payroll staff (Bursar, Accountant, Developer, Super Admin and anyone given payroll access) can open any staff member's. */
export default async function Payslips({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const s = await allSettings();
  const payroll = can(me, "payroll:view");
  const want = str(sp.user);
  const target = payroll && /^[0-9a-f-]{36}$/i.test(want) ? want : me.id;
  const [who] = await sql`SELECT first_name, last_name FROM users WHERE id = ${target} AND school_id = ${me.schoolId} AND role <> 'developer'`;
  const staff: Row[] = payroll ? await sql`SELECT DISTINCT u.id, u.first_name, u.last_name FROM payslips p JOIN users u ON u.id = p.user_id
    WHERE u.school_id = ${me.schoolId} AND u.role <> 'developer' ORDER BY u.last_name, u.first_name LIMIT 400` : [];
  const rows: Row[] = who ? await sql`SELECT p.*, r.period, r.status, sp.bank_name, pr.position FROM payslips p JOIN payroll_runs r ON r.id = p.run_id
                         LEFT JOIN salary_profiles sp ON sp.user_id = p.user_id LEFT JOIN staff_profiles pr ON pr.user_id = p.user_id
                         WHERE p.user_id = ${target} AND r.status IN ('approved','paid') ORDER BY r.period DESC LIMIT 12` : [];
  if (target !== me.id && rows.length) await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "payslip.view", entity: "user", entityId: target });
  const name = who ? `${who.first_name} ${who.last_name}` : me.name;

  return (
    <>
      <PageHeader title={target === me.id ? "My payslips" : `Payslips · ${name}`} sub={payroll ? "Payroll staff can open any staff member's payslips. Every view of someone else's is logged." : "Only you can see your payslips."} actions={rows.length > 0 && <PrintButton />} />
      {payroll && (
        <form className="no-print mb-5 flex flex-wrap items-end gap-2" role="search">
          <div className="field min-w-[16rem]"><label htmlFor="user">Staff member</label>
            <select id="user" name="user" className="select" defaultValue={target}><option value={me.id}>Myself</option>{staff.filter((x) => x.id !== me.id).map((x) => <option key={x.id} value={x.id}>{x.last_name}, {x.first_name}</option>)}</select></div>
          <button className="btn btn-primary">Open</button>
          <Link href="/portal/export/payroll" className="btn btn-ghost">Download all payslips (Excel)</Link>
        </form>
      )}
      {rows.length === 0 ? <Empty title="No payslips yet" /> : rows.map((p) => {
        const fines: { day: string; reason: string; amount: number }[] = p.detail?.fineItems ?? [];
        const earnings = Number(p.gross) + Number(p.allowances);
        const deductions = Number(p.pension) + Number(p.tax) + Number(p.fines) + Number(p.advances);
        return (
          <article key={p.id} className="print-sheet card mb-5 p-6">
            <header className="flex items-center gap-4 border-b-2 border-ink pb-3"><Logo size={56} />
              <div><p className="font-display text-xl">{s.brand.school}</p><p className="text-xs text-muted">Payslip · {p.period}</p></div>
              <span className="ml-auto text-right text-sm"><b>{name}</b><br /><span className="text-muted">{p.position}</span></span></header>
            <table className="tbl mt-3 text-sm"><tbody>
              <tr><td colSpan={2} className="eyebrow">Earnings</td></tr>
              <tr><td>Base salary</td><td className="text-right">{ngn(p.gross)}</td></tr>
              <tr><td>Allowances</td><td className="text-right">{ngn(p.allowances)}</td></tr>
              <tr className="font-bold"><td>Total earnings</td><td className="text-right">{ngn(earnings)}</td></tr>
              <tr><td colSpan={2} className="eyebrow">Deductions</td></tr>
              <tr><td>Pension</td><td className="text-right">− {ngn(p.pension)}</td></tr>
              <tr><td>Income tax</td><td className="text-right">− {ngn(p.tax)}</td></tr>
              <tr><td>Fines and discipline (lateness, absence, HRM cases)</td><td className="text-right">− {ngn(p.fines)}</td></tr>
              {fines.map((f, i) => <tr key={i} className="text-xs text-muted"><td className="pl-6">{new Date(f.day).toLocaleDateString("en-GB")} · {f.reason}</td><td className="text-right">{ngn(f.amount)}</td></tr>)}
              {Number(p.advances) > 0 && <tr><td>Salary advance recovered</td><td className="text-right">− {ngn(p.advances)}</td></tr>}
              <tr className="font-bold"><td>Total deductions</td><td className="text-right">− {ngn(deductions)}</td></tr>
              <tr className="bg-paper-2 text-base font-bold"><td>Net pay</td><td className="text-right">{ngn(p.net)}</td></tr>
            </tbody></table>
            <p className="mt-2 text-xs text-muted">{p.status === "paid" ? "Paid" : "Approved, awaiting payment"}{p.bank_name ? ` · ${p.bank_name}` : ""}</p>
          </article>
        );
      })}
    </>
  );
}
