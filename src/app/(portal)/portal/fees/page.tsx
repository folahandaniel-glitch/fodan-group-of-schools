import Link from "next/link";
import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str, listClasses, listTerms } from "@/lib/data";
import { childIds, studentOf } from "@/lib/scope";
import { currentTerm } from "@/lib/settings";
import { LEVEL_OPTIONS } from "@/lib/curriculum";
import { redirect } from "next/navigation";
import { Badge, Card, Empty, Field, PageHeader, Stat } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { deleteFeeItem, generateInvoices, recordPayment, saveFeeItem } from "./actions";

export const metadata = { title: "School fees" };
export const dynamic = "force-dynamic";
const naira = (n: number | string) => `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
type Row = Record<string, any>;

export default async function Fees({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const sp = await searchParams;
  const manage = can(me, "fees:manage");
  const learner = me.role === "student" || me.role === "parent";
  if (!manage && !can(me, "fees:view") && !learner) redirect("/forbidden");

  if (learner || (!manage && !can(me, "fees:view"))) {
    const ids = me.role === "student" ? [(await studentOf(me.id))?.id as string].filter(Boolean) : await childIds(me.id);
    const inv: Row[] = ids.length ? await sql`SELECT i.id, i.number, i.total, i.paid, i.lines, i.created_at, t.name AS term, s.first_name, s.last_name FROM fee_invoices i JOIN students s ON s.id = i.student_id
      LEFT JOIN terms t ON t.id = i.term_id WHERE i.student_id = ANY(${ids}) ORDER BY i.created_at DESC LIMIT 40` : [];
    const pays: Row[] = inv.length ? await sql`SELECT id, invoice_id, receipt_no, amount, method, paid_on FROM fee_payments WHERE invoice_id = ANY(${inv.map((i) => i.id)}) ORDER BY paid_on DESC` : [];
    return (
      <>
        <PageHeader title="School fees" sub="Invoices, what has been paid and what is outstanding. Pay at the school office; the receipt appears here." />
        {inv.length === 0 ? <Empty title="No invoices yet" /> : inv.map((i) => (
          <Card key={i.id} className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-xl">{i.number} · {i.first_name} {i.last_name}</h2><p className="text-sm text-muted">{i.term ?? ""}</p></div>
              <Badge tone={Number(i.paid) >= Number(i.total) ? "ok" : Number(i.paid) > 0 ? "warn" : "bad"}>{Number(i.paid) >= Number(i.total) ? "Paid" : Number(i.paid) > 0 ? "Part paid" : "Unpaid"}</Badge></div>
            <ul className="mt-2 divide-y divide-line text-sm">{(i.lines as { name: string; amount: number }[]).map((l, k) => <li key={k} className="flex justify-between py-1.5"><span>{l.name}</span><span>{naira(l.amount)}</span></li>)}
              <li className="flex justify-between py-1.5 font-bold"><span>Total</span><span>{naira(i.total)}</span></li>
              <li className="flex justify-between py-1.5"><span>Paid</span><span>{naira(i.paid)}</span></li>
              <li className="flex justify-between py-1.5 font-bold text-bad"><span>Balance</span><span>{naira(Number(i.total) - Number(i.paid))}</span></li></ul>
            {pays.filter((p) => p.invoice_id === i.id).length > 0 && <p className="mt-2 text-sm">Receipts: {pays.filter((p) => p.invoice_id === i.id).map((p) => <Link key={p.id} href={`/portal/fees/receipt/${p.id}`} className="mr-2 font-bold text-royal">{p.receipt_no}</Link>)}</p>}
          </Card>))}
      </>
    );
  }

  const term = str(sp.term) || (await currentTerm())?.id || "";
  const cls = str(sp.class), status = str(sp.status), q = str(sp.q).trim().slice(0, 60);
  const [classes, terms] = await Promise.all([listClasses(me.schoolId), listTerms(me.schoolId)]);
  const items: Row[] = await sql`SELECT id, name, amount, level FROM fee_items WHERE school_id = ${me.schoolId} AND active ORDER BY level NULLS FIRST, name`;
  const like = "%" + q.replace(/[%_\\]/g, "") + "%";
  const rows: Row[] = await sql`SELECT i.id, i.number, i.total, i.paid, s.first_name, s.last_name, s.admission_no, c.name AS cname, c.arm FROM fee_invoices i JOIN students s ON s.id = i.student_id LEFT JOIN classes c ON c.id = s.class_id
    WHERE i.school_id = ${me.schoolId} ${/^[0-9a-f-]{36}$/i.test(term) ? sql`AND i.term_id = ${term}` : sql``} ${/^[0-9a-f-]{36}$/i.test(cls) ? sql`AND s.class_id = ${cls}` : sql``}
      ${status === "unpaid" ? sql`AND i.paid = 0` : status === "part" ? sql`AND i.paid > 0 AND i.paid < i.total` : status === "paid" ? sql`AND i.paid >= i.total` : status === "owing" ? sql`AND i.paid < i.total` : sql``}
      ${q ? sql`AND (s.first_name ILIKE ${like} OR s.last_name ILIKE ${like} OR s.admission_no ILIKE ${like} OR i.number ILIKE ${like})` : sql``}
    ORDER BY c.name, s.last_name LIMIT 300`;
  const billed = rows.reduce((a, r) => a + Number(r.total), 0), paid = rows.reduce((a, r) => a + Number(r.paid), 0);

  return (
    <>
      <PageHeader title="School fees" sub="Set the fees, create invoices for a class or the whole school, record payments and issue receipts. Every payment is booked in the ledger." />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Billed" value={naira(billed)} /><Stat label="Received" value={naira(paid)} tone="royal" /><Stat label="Outstanding" value={naira(billed - paid)} /><Stat label="Invoices" value={rows.length} tone="royal" />
      </section>

      {manage && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <Card><h2 className="text-xl">Fee schedule</h2>
            {items.length === 0 ? <p className="mt-2 text-sm text-muted">No fees yet.</p> : (
              <ul className="mt-2 divide-y divide-line text-sm">{items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-1.5"><span>{i.name} <span className="text-xs text-muted">{i.level ? LEVEL_OPTIONS.find((o) => o.value === String(i.level))?.label : "All classes"}</span></span>
                  <span className="flex items-center gap-2"><b>{naira(i.amount)}</b><form action={deleteFeeItem}><input type="hidden" name="id" value={i.id} /><button className="btn btn-danger btn-sm">Delete</button></form></span></li>))}</ul>)}
            <ActionForm action={saveFeeItem} submit="Add fee" small className="mt-3 grid gap-2 sm:grid-cols-3"><Field label="Fee name" name="name" required /><Field label="Amount (₦)" name="amount" type="number" min={0} required />
              <div className="field"><label htmlFor="fl">Applies to</label><select id="fl" name="level" className="select"><option value="">All classes</option>{LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div></ActionForm>
          </Card>
          <Card><h2 className="text-xl">Create invoices</h2>
            <p className="mt-1 text-sm text-muted">One invoice per student per term, from the fees that apply to their class. Students who already have one are skipped.</p>
            <ActionForm action={generateInvoices} submit="Create invoices" small className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="field"><label htmlFor="gt">Term</label><select id="gt" name="term" defaultValue={term} className="select">{terms.map((t) => <option key={t.id} value={t.id}>{t.session} · {t.name}</option>)}</select></div>
              <div className="field"><label htmlFor="gc">Class</label><select id="gc" name="class" className="select"><option value="">Whole school</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
            </ActionForm></Card>
        </div>
      )}

      <Card className="mb-3"><form className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]" role="search">
        <div className="field"><label htmlFor="t">Term</label><select id="t" name="term" defaultValue={term} className="select"><option value="">All</option>{terms.map((t) => <option key={t.id} value={t.id}>{t.session} · {t.name}</option>)}</select></div>
        <div className="field"><label htmlFor="c">Class</label><select id="c" name="class" defaultValue={cls} className="select"><option value="">All</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div className="field"><label htmlFor="s">Status</label><select id="s" name="status" defaultValue={status} className="select"><option value="">Any</option><option value="owing">Owing</option><option value="unpaid">Unpaid</option><option value="part">Part paid</option><option value="paid">Paid</option></select></div>
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} className="input" placeholder="Name, admission no, invoice" /></div>
        <button className="btn btn-primary self-end">Filter</button></form></Card>

      <Card pad={false} className="overflow-x-auto">
        {rows.length === 0 ? <div className="p-5"><Empty title="No invoices match" /></div> : (
          <table className="tbl min-w-[46rem] text-sm"><thead><tr><th>Invoice</th><th>Student</th><th>Class</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Balance</th>{manage && <th>Record payment</th>}</tr></thead>
            <tbody>{rows.map((r) => {
              const bal = Number(r.total) - Number(r.paid);
              return (
                <tr key={r.id}><td>{r.number}</td><td><b>{r.last_name}, {r.first_name}</b><br /><span className="text-xs text-muted">{r.admission_no}</span></td><td>{r.cname}{r.arm}</td>
                  <td className="text-right">{naira(r.total)}</td><td className="text-right">{naira(r.paid)}</td><td className={`text-right font-bold ${bal > 0 ? "text-bad" : "text-ok"}`}>{naira(bal)}</td>
                  {manage && <td>{bal > 0 ? (
                    <ActionForm action={recordPayment} submit="Receive" small className="flex flex-wrap items-end gap-1"><input type="hidden" name="invoice" value={r.id} />
                      <input name="amount" type="number" min={1} max={bal} step="0.01" defaultValue={bal} className="input !min-h-8 !w-28 !py-1" aria-label="Amount" required />
                      <select name="method" className="select !min-h-8 !w-auto !py-1" aria-label="Method"><option value="cash">Cash</option><option value="transfer">Transfer</option><option value="pos">POS</option><option value="cheque">Cheque</option></select></ActionForm>) : <Badge tone="ok">Cleared</Badge>}</td>}
                </tr>);
            })}</tbody></table>)}
      </Card>
    </>
  );
}
