import Link from "next/link";
import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { Badge, Card, Empty, Field, PageHeader, statusTone } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { advanceRun, generateRun, saveRates, saveSalary } from "./actions";

export const metadata = { title: "Payroll" };
export const dynamic = "force-dynamic";
const ngn = (n: unknown) => `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export default async function Payroll() {
  const me = await requirePerm("payroll:view");
  const manage = can(me, "payroll:manage");
  const rates = (await getSetting<{ pensionPct: number; taxPct: number }>("payroll")) ?? { pensionPct: 0, taxPct: 0 };
  const runs = await sql`SELECT r.*, (SELECT count(*)::int FROM payslips p WHERE p.run_id = r.id) AS slips, (SELECT COALESCE(sum(net),0) FROM payslips p WHERE p.run_id = r.id) AS net
                         FROM payroll_runs r WHERE r.school_id = ${me.schoolId} ORDER BY r.period DESC LIMIT 24`;
  const staff = manage ? await sql`SELECT u.id, u.first_name, u.last_name, s.gross_monthly, s.allowances, s.bank_name FROM users u LEFT JOIN salary_profiles s ON s.user_id = u.id
                                   WHERE u.school_id = ${me.schoolId} AND u.role NOT IN ('student','parent') AND u.status = 'active' ORDER BY u.last_name LIMIT 300` : [];
  const month = new Date().toISOString().slice(0, 7);
  return (
    <>
      <PageHeader title="Payroll" sub="Monthly payslips from salary profiles, statutory rates and unpaid fines. One person generates, a different person approves, and a different person pays." />
      {manage && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Card><h2 className="text-xl">Generate a payroll run</h2>
            <div className="mt-3"><ActionForm action={generateRun} submit="Generate draft" className="flex flex-wrap items-end gap-3">
              <Field label="Month" name="period" type="month" defaultValue={month} required />
            </ActionForm></div></Card>
          <Card><h2 className="text-xl">Statutory rates</h2>
            <p className="mt-1 text-sm text-muted">Pension applies to base salary; tax to total earnings. Set to the rates your accountant confirms.</p>
            <div className="mt-3"><ActionForm action={saveRates} submit="Save rates" className="grid grid-cols-2 gap-3">
              <Field label="Pension (employee %)" name="pensionPct" type="number" step="0.1" defaultValue={rates.pensionPct} />
              <Field label="Income tax (flat %)" name="taxPct" type="number" step="0.1" defaultValue={rates.taxPct} />
            </ActionForm></div></Card>
        </div>
      )}

      <Card className="mb-5">
        <h2 className="text-xl">Payroll runs</h2>
        {runs.length === 0 ? <div className="mt-3"><Empty title="No payroll runs yet" /></div> : (
          <div className="mt-3 overflow-x-auto"><table className="tbl"><thead><tr><th>Period</th><th>Payslips</th><th>Net total</th><th>Status</th><th></th></tr></thead>
            <tbody>{runs.map((r) => (
              <tr key={r.id}><td className="font-bold"><Link className="text-royal hover:underline" href={`/portal/payroll/${r.id}`}>{r.period}</Link></td><td>{r.slips}</td><td>{ngn(r.net)}</td>
                <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                <td className="whitespace-nowrap">
                  {r.status === "draft" && can(me, "payroll:approve") && r.created_by !== me.id && <form action={advanceRun} className="inline"><input type="hidden" name="id" value={r.id} /><button name="op" value="approve" className="btn btn-gold btn-sm">Approve</button></form>}
                  {r.status === "approved" && manage && r.approved_by !== me.id && <form action={advanceRun} className="inline"><input type="hidden" name="id" value={r.id} /><button name="op" value="pay" className="btn btn-primary btn-sm">Mark paid</button></form>}
                </td></tr>))}</tbody></table></div>
        )}
      </Card>

      {manage && (
        <Card><h2 className="text-xl">Salary profiles</h2>
          <ul className="mt-3 divide-y divide-line">
            {staff.map((s) => (
              <li key={s.id} className="py-2">
                <ActionForm action={saveSalary} submit="Save" small className="grid items-end gap-2 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                  <input type="hidden" name="user" value={s.id} />
                  <p className="text-sm font-bold">{s.last_name}, {s.first_name}</p>
                  <Field label="Base monthly (₦)" name="gross" type="number" min={0} defaultValue={s.gross_monthly ?? 0} />
                  <Field label="Allowances (₦)" name="allowances" type="number" min={0} defaultValue={s.allowances ?? 0} />
                  <Field label="Bank" name="bank" defaultValue={s.bank_name} />
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
