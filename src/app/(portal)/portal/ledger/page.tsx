import { requirePerm, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ensureAccounts } from "@/lib/ledger";
import { Card, Empty, Field, PageHeader, Select } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { manualEntry } from "./actions";

export const metadata = { title: "Ledger" };
export const dynamic = "force-dynamic";
const ngn = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export default async function Ledger() {
  const me = await requirePerm("ledger:view");
  await ensureAccounts(me.schoolId);
  const accts = await sql`SELECT code, name, kind FROM ledger_accounts WHERE school_id = ${me.schoolId} ORDER BY code`;
  const tb = await sql`SELECT code, sum(d)::float AS debit, sum(c)::float AS credit FROM (
      SELECT debit_code AS code, amount AS d, 0 AS c FROM ledger_entries WHERE school_id = ${me.schoolId}
      UNION ALL SELECT credit_code, 0, amount FROM ledger_entries WHERE school_id = ${me.schoolId}) x GROUP BY code`;
  const by = new Map(tb.map((r) => [r.code as string, r]));
  const entries = await sql`SELECT entry_date, description, debit_code, credit_code, amount FROM ledger_entries WHERE school_id = ${me.schoolId} ORDER BY created_at DESC LIMIT 40`;
  const totD = tb.reduce((s, r) => s + r.debit, 0), totC = tb.reduce((s, r) => s + r.credit, 0);
  const bal = (a: { code: string; kind: string }) => {
    const r = by.get(a.code); const d = r?.debit ?? 0, c = r?.credit ?? 0;
    return ["asset", "expense"].includes(a.kind) ? d - c : c - d;
  };
  return (
    <>
      <PageHeader title="Ledger" sub="Double-entry books. Paid finance requests and paid payroll runs post automatically; entries are append-only." />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card pad={false} className="overflow-x-auto">
          <table className="tbl text-sm"><thead><tr><th>Code</th><th>Account</th><th>Type</th><th className="text-right">Balance</th></tr></thead>
            <tbody>{accts.map((a) => <tr key={a.code}><td>{a.code}</td><td>{a.name}</td><td className="capitalize">{a.kind}</td><td className="text-right font-bold">{ngn(bal(a as { code: string; kind: string }))}</td></tr>)}
              <tr><td colSpan={3} className="text-xs text-muted">Trial balance: debits {ngn(totD)} · credits {ngn(totC)} {Math.abs(totD - totC) < 0.005 ? "· balanced" : "· OUT OF BALANCE"}</td><td /></tr></tbody></table>
        </Card>
        {can(me, "ledger:manage") && (
          <Card><h2 className="text-xl">Manual entry</h2>
            <div className="mt-3"><ActionForm action={manualEntry} submit="Post entry">
              <Field label="Description" name="description" required />
              <Select label="Debit" name="debit" required options={accts.map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` }))} />
              <Select label="Credit" name="credit" required options={accts.map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` }))} />
              <Field label="Amount (₦)" name="amount" type="number" min={0.01} step={0.01} required />
              <Field label="Date" name="date" type="date" />
            </ActionForm></div></Card>
        )}
      </div>
      <Card className="mt-5"><h2 className="text-xl">Recent entries</h2>
        {entries.length === 0 ? <div className="mt-3"><Empty title="No entries yet" /></div> : (
          <ul className="mt-3 divide-y divide-line text-sm">{entries.map((e, i) => (
            <li key={i} className="flex justify-between gap-3 py-2"><span>{e.description}<br /><span className="text-xs text-muted">{new Date(e.entry_date).toLocaleDateString("en-GB")} · Dr {e.debit_code} / Cr {e.credit_code}</span></span><b>{ngn(Number(e.amount))}</b></li>))}</ul>)}
      </Card>
    </>
  );
}
