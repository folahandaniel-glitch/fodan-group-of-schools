import { sql } from "./db";

export const DEFAULT_ACCOUNTS: [string, string, string][] = [
  ["1000", "Cash and bank", "asset"], ["1100", "Fees receivable", "asset"], ["2000", "Staff deductions payable", "liability"],
  ["2100", "Accounts payable", "liability"], ["4000", "School fees income", "income"], ["4100", "Other income", "income"],
  ["5000", "Salaries and wages", "expense"], ["5100", "Maintenance", "expense"], ["5200", "Utilities", "expense"],
  ["5300", "Learning materials", "expense"], ["5400", "Events", "expense"], ["5500", "Transport", "expense"], ["5900", "Other expenses", "expense"],
];

export async function ensureAccounts(schoolId: string): Promise<void> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM ledger_accounts WHERE school_id = ${schoolId}`;
  if (n > 0) return;
  for (const [code, name, kind] of DEFAULT_ACCOUNTS) await sql`INSERT INTO ledger_accounts (school_id, code, name, kind) VALUES (${schoolId}, ${code}, ${name}, ${kind}) ON CONFLICT DO NOTHING`;
}

const CATEGORY_ACCOUNT: Record<string, string> = { Salaries: "5000", Maintenance: "5100", Utilities: "5200", "Learning materials": "5300", Events: "5400", Transport: "5500" };
export const expenseAccountFor = (category: string) => CATEGORY_ACCOUNT[category] ?? "5900";

/** Idempotent double-entry posting: the same `ref` is never posted twice. */
export async function post(o: { schoolId: string; description: string; debit: string; credit: string; amount: number; ref: string; by?: string | null; date?: string }): Promise<boolean> {
  if (!(o.amount > 0)) return false;
  await ensureAccounts(o.schoolId);
  const r = await sql`INSERT INTO ledger_entries (school_id, entry_date, description, debit_code, credit_code, amount, ref, created_by)
    VALUES (${o.schoolId}, ${o.date ?? new Date().toISOString().slice(0, 10)}, ${o.description}, ${o.debit}, ${o.credit}, ${o.amount}, ${o.ref}, ${o.by ?? null})
    ON CONFLICT (school_id, ref) DO NOTHING RETURNING id`;
  return r.length > 0;
}
