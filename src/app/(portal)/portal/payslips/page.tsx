import { requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { allSettings } from "@/lib/settings";
import { Empty, Logo, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "My payslips" };
export const dynamic = "force-dynamic";
const ngn = (n: unknown) => `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

/** Own payslips only — the query is scoped to the signed-in user; no id parameter exists to tamper with. */
export default async function Payslips() {
  const me = await requireMe();
  const s = await allSettings();
  const rows = await sql`SELECT p.*, r.period, r.status, sp.bank_name, pr.position FROM payslips p JOIN payroll_runs r ON r.id = p.run_id
                         LEFT JOIN salary_profiles sp ON sp.user_id = p.user_id LEFT JOIN staff_profiles pr ON pr.user_id = p.user_id
                         WHERE p.user_id = ${me.id} AND r.status IN ('approved','paid') ORDER BY r.period DESC LIMIT 12`;
  return (
    <>
      <PageHeader title="My payslips" sub="Only you can see your payslips." actions={rows.length > 0 && <PrintButton />} />
      {rows.length === 0 ? <Empty title="No payslips yet" /> : rows.map((p) => (
        <article key={p.id} className="print-sheet card mb-5 p-6">
          <header className="flex items-center gap-4 border-b-2 border-ink pb-3"><Logo size={56} />
            <div><p className="font-display text-xl">{s.brand.school}</p><p className="text-xs text-muted">Payslip · {p.period}</p></div>
            <span className="ml-auto text-right text-sm"><b>{me.name}</b><br /><span className="text-muted">{p.position}</span></span></header>
          <table className="tbl mt-3 text-sm"><tbody>
            <tr><td>Base salary</td><td className="text-right">{ngn(p.gross)}</td></tr>
            <tr><td>Allowances</td><td className="text-right">{ngn(p.allowances)}</td></tr>
            <tr><td>Pension</td><td className="text-right">− {ngn(p.pension)}</td></tr>
            <tr><td>Income tax</td><td className="text-right">− {ngn(p.tax)}</td></tr>
            <tr><td>Fines (lateness / absence)</td><td className="text-right">− {ngn(p.fines)}</td></tr>
            <tr className="font-bold"><td>Net pay</td><td className="text-right">{ngn(p.net)}</td></tr>
          </tbody></table>
          <p className="mt-2 text-xs text-muted">{p.status === "paid" ? "Paid" : "Approved, awaiting payment"}{p.bank_name ? ` · ${p.bank_name}` : ""}</p>
        </article>
      ))}
    </>
  );
}
