import { can, requireMe } from "@/lib/auth";
import { sql } from "@/lib/db";
import { str } from "@/lib/data";
import { ensureAccounts } from "@/lib/ledger";
import { redirect } from "next/navigation";
import { isRoot } from "@/lib/logic/permissions";
import { Badge, Card, Empty, Field, PageHeader, Stat } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { recordExpense } from "./actions";

export const metadata = { title: "Expense register" };
export const dynamic = "force-dynamic";
const naira = (n: number | string) => `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
type Row = Record<string, any>;
const SOURCE: Record<string, string> = { manual: "Recorded", finance: "Finance approval", procurement: "Purchase order", payroll: "Payroll" };

export default async function Expenses({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireMe();
  const record = can(me, "expenses:manage");
  if (!record && !can(me, "expenses:view") && !can(me, "ledger:view") && !isRoot(me.role)) redirect("/forbidden");
  await ensureAccounts(me.schoolId);
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const first = today.slice(0, 8) + "01";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.from)) ? str(sp.from) : first;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.to)) ? str(sp.to) : today;
  const cat = str(sp.category), src = str(sp.source);

  const cats: Row[] = await sql`SELECT code, name FROM ledger_accounts WHERE school_id = ${me.schoolId} AND kind = 'expense' ORDER BY code`;
  const rows: Row[] = await sql`SELECT e.id, e.entry_date, e.description, e.payee, e.method, e.amount, e.ref, e.source, e.receipt_file, a.name AS category, u.first_name || ' ' || u.last_name AS by
    FROM ledger_entries e JOIN ledger_accounts a ON a.school_id = e.school_id AND a.code = e.debit_code AND a.kind = 'expense'
    LEFT JOIN users u ON u.id = e.created_by AND u.role <> 'developer'
    WHERE e.school_id = ${me.schoolId} AND e.entry_date BETWEEN ${from} AND ${to} ${cat ? sql`AND e.debit_code = ${cat}` : sql``} ${src ? sql`AND e.source = ${src}` : sql``}
    ORDER BY e.entry_date DESC, e.created_at DESC LIMIT 300`;
  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + Number(r.amount));
  const noReceipt = rows.filter((r) => r.source === "manual" && !r.receipt_file).length;
  const xl = `/portal/export/expenses?from=${from}&to=${to}`;

  return (
    <>
      <PageHeader title="Expense register" sub="Every payment for running the school, who made it, to whom, and the receipt. Payroll, approved finance requests and purchase orders are recorded automatically."
        actions={<a className="btn btn-ghost btn-sm" href={xl}>Download Excel</a>} />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Spent in this period" value={naira(total)} /><Stat label="Entries" value={rows.length} tone="royal" />
        <Stat label="Largest category" value={[...byCat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"} /><Stat label="Without a receipt" value={noReceipt} tone="royal" hint="Recorded by hand" />
      </section>

      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3" role="search">
          <div className="field"><label htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={from} className="input" /></div>
          <div className="field"><label htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={to} className="input" /></div>
          <div className="field"><label htmlFor="category">Category</label><select id="category" name="category" defaultValue={cat} className="select"><option value="">All</option>{cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
          <div className="field"><label htmlFor="source">Source</label><select id="source" name="source" defaultValue={src} className="select"><option value="">All</option>{Object.entries(SOURCE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <button className="btn btn-primary">Show</button>
        </form>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card pad={false} className="overflow-x-auto">
          {rows.length === 0 ? <div className="p-5"><Empty title="No expenses in this period" /></div> : (
            <table className="tbl min-w-[40rem] text-sm"><thead><tr><th>Date</th><th>Category</th><th>Paid to / for</th><th>By</th><th className="text-right">Amount</th><th>Receipt</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}><td className="whitespace-nowrap">{new Date(r.entry_date).toLocaleDateString("en-GB")}</td><td>{r.category}</td>
                  <td><b>{r.payee ?? "—"}</b><br /><span className="text-xs text-muted">{r.description}{r.method ? ` · ${r.method}` : ""} · {SOURCE[r.source] ?? r.source}</span></td>
                  <td>{r.by ?? "System"}</td><td className="text-right font-bold">{naira(r.amount)}</td>
                  <td>{r.receipt_file ? <a className="font-bold text-royal" href={`/api/files/${r.receipt_file}`} target="_blank" rel="noopener noreferrer">View</a> : r.source === "manual" ? <Badge tone="warn">none</Badge> : <span className="text-muted">—</span>}</td></tr>))}</tbody></table>)}
        </Card>
        <div className="space-y-5">
          <Card><h2 className="text-xl">By category</h2>
            {byCat.size === 0 ? <p className="mt-2 text-sm text-muted">Nothing yet.</p> : (
              <ul className="mt-2 divide-y divide-line text-sm">{[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k} className="flex justify-between py-2"><span>{k}</span><b>{naira(v)}</b></li>)}</ul>)}
          </Card>
          {record && (
            <Card><h2 className="text-xl">Record an expense</h2>
              <ActionForm action={recordExpense} submit="Record expense" className="mt-3 grid gap-3" encType="multipart/form-data">
                <div className="field"><label htmlFor="rc">Category</label><select id="rc" name="category" className="select" required>{cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
                <Field label="Paid to" name="payee" required /><Field label="What it was for" name="description" required />
                <Field label="Amount (₦)" name="amount" type="number" min={1} step="0.01" required /><Field label="Date paid" name="date" type="date" defaultValue={today} />
                <div className="field"><label htmlFor="rm">How paid</label><select id="rm" name="method" className="select"><option value="cash">Cash</option><option value="transfer">Bank transfer</option><option value="pos">POS</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div>
                <Field label="Receipt / invoice number" name="reference" />
                <div className="field"><label htmlFor="rf">Receipt (PDF or photo, max 4 MB)</label><input id="rf" name="receipt" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="input" /></div>
              </ActionForm>
              <p className="mt-2 text-xs text-muted">Posted to the ledger as a payment from Cash and bank. Entries cannot be edited or deleted.</p>
            </Card>)}
        </div>
      </div>
    </>
  );
}
