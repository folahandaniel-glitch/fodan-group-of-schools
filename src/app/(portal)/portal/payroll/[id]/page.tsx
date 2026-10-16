import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Badge, Card, PageHeader, statusTone } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";
const ngn = (n: unknown) => `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export default async function RunDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("payroll:view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [r] = await sql`SELECT * FROM payroll_runs WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!r) notFound();
  const rows = await sql`SELECT p.*, u.first_name, u.last_name FROM payslips p JOIN users u ON u.id = p.user_id WHERE p.run_id = ${id} ORDER BY u.last_name`;
  const sum = (k: string) => rows.reduce((s, x) => s + Number(x[k]), 0);
  return (
    <>
      <PageHeader eyebrow="Payroll run" title={r.period} actions={<><Badge tone={statusTone(r.status)}>{r.status}</Badge><PrintButton label="Print register" /></>} />
      <Card pad={false} className="overflow-x-auto">
        <table className="tbl text-sm">
          <thead><tr><th>Staff</th><th>Base</th><th>Allowances</th><th>Pension</th><th>Tax</th><th>Fines</th><th>Net</th></tr></thead>
          <tbody>
            {rows.map((p) => <tr key={p.id}><td>{p.last_name}, {p.first_name}</td><td>{ngn(p.gross)}</td><td>{ngn(p.allowances)}</td><td>{ngn(p.pension)}</td><td>{ngn(p.tax)}</td><td>{ngn(p.fines)}</td><td className="font-bold">{ngn(p.net)}</td></tr>)}
            <tr className="font-bold"><td>Total</td><td>{ngn(sum("gross"))}</td><td>{ngn(sum("allowances"))}</td><td>{ngn(sum("pension"))}</td><td>{ngn(sum("tax"))}</td><td>{ngn(sum("fines"))}</td><td>{ngn(sum("net"))}</td></tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
