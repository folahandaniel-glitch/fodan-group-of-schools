import { notFound } from "next/navigation";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { canSeeStudent } from "@/lib/scope";
import { allSettings } from "@/lib/settings";
import { Logo } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Fee receipt" };
export const dynamic = "force-dynamic";
const naira = (n: number | string) => `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMe();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [p] = await sql`SELECT p.receipt_no, p.amount, p.method, p.reference, p.paid_on, i.number, i.total, i.paid, i.student_id, s.first_name, s.last_name, s.admission_no, t.name AS term
    FROM fee_payments p JOIN fee_invoices i ON i.id = p.invoice_id JOIN students s ON s.id = i.student_id LEFT JOIN terms t ON t.id = i.term_id WHERE p.id = ${id} AND p.school_id = ${me.schoolId}`;
  if (!p) notFound();
  if (!can(me, "fees:manage") && !can(me, "fees:view") && !(await canSeeStudent(me, p.student_id))) notFound();
  const brand = (await allSettings()).brand as { school: string };
  return (
    <>
      <div className="no-print mb-4"><PrintButton label="Print receipt" /></div>
      <article className="print-sheet card mx-auto max-w-xl p-8">
        <header className="flex items-center gap-4 border-b-2 border-ink pb-3"><Logo size={56} /><div><p className="font-display text-xl">{brand.school}</p><p className="text-xs text-muted">Official fee receipt</p></div><b className="ml-auto text-right">{p.receipt_no}</b></header>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Received from</dt><dd className="font-bold">{p.first_name} {p.last_name} ({p.admission_no})</dd></div>
          <div className="flex justify-between"><dt className="text-muted">For</dt><dd>Invoice {p.number}{p.term ? ` · ${p.term}` : ""}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Date</dt><dd>{new Date(p.paid_on).toLocaleDateString("en-GB")}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Method</dt><dd className="capitalize">{p.method}{p.reference ? ` · ${p.reference}` : ""}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-lg"><dt className="font-bold">Amount received</dt><dd className="font-bold">{naira(p.amount)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Invoice balance after this payment</dt><dd>{naira(Number(p.total) - Number(p.paid))}</dd></div>
        </dl>
        <p className="mt-6 text-xs text-muted">Thank you. This receipt is valid without a signature when printed from the school portal.</p>
      </article>
    </>
  );
}
