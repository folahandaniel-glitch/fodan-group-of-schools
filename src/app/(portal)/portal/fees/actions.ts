"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { post } from "@/lib/ledger";
import { currentTerm } from "@/lib/settings";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const done = () => revalidatePath("/portal/fees");

export async function saveFeeItem(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("fees:manage");
  const name = clean(fd.get("name"), 80), amount = Number(fd.get("amount"));
  const level = fd.get("level") ? Number(fd.get("level")) : null;
  if (!name || !(amount >= 0)) return { error: "Enter the fee name and a valid amount." };
  if (level !== null && !(level >= 1 && level <= 12)) return { error: "Choose a valid class level." };
  try { await sql`INSERT INTO fee_items (school_id, name, amount, level) VALUES (${me.schoolId}, ${name}, ${amount}, ${level})`; }
  catch { return { error: "That fee already exists for the same class level." }; }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "fees.item.add", entity: "fee_item", meta: { name, amount, level } });
  done();
  return { ok: "Fee added." };
}

export async function deleteFeeItem(fd: FormData): Promise<void> {
  const me = await requirePerm("fees:manage");
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`DELETE FROM fee_items WHERE id = ${id} AND school_id = ${me.schoolId}`;
  done();
}

/** One invoice per student per term, from the fee items that apply to the student's class level. Existing invoices are never changed. */
export async function generateInvoices(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("fees:manage");
  const term = clean(fd.get("term"), 40) || (await currentTerm())?.id || "";
  const cls = clean(fd.get("class"), 40);
  if (!UUID.test(term)) return { error: "Choose a term." };
  const [t] = await sql`SELECT 1 FROM terms WHERE id = ${term} AND school_id = ${me.schoolId}`;
  if (!t) return { error: "Term not found." };
  const students = await sql`SELECT s.id, c.level FROM students s JOIN classes c ON c.id = s.class_id
    WHERE s.school_id = ${me.schoolId} AND s.status IN ('active','enrolled') ${UUID.test(cls) ? sql`AND s.class_id = ${cls}` : sql``}
      AND NOT EXISTS (SELECT 1 FROM fee_invoices i WHERE i.student_id = s.id AND i.term_id = ${term}) LIMIT 800`;
  const items = await sql`SELECT name, amount::float AS amount, level FROM fee_items WHERE school_id = ${me.schoolId} AND active`;
  if (items.length === 0) return { error: "Add at least one fee first." };
  let made = 0;
  for (const s of students) {
    const lines = items.filter((i) => i.level === null || i.level === s.level).map((i) => ({ name: i.name, amount: i.amount }));
    const total = lines.reduce((a, l) => a + l.amount, 0);
    if (lines.length === 0 || total <= 0) continue;
    const [n] = await sql`SELECT coalesce(max(substring(number from '[0-9]+$')::int), 0) + 1 AS n FROM fee_invoices WHERE school_id = ${me.schoolId}`;
    await sql`INSERT INTO fee_invoices (school_id, student_id, term_id, number, total, lines, created_by) VALUES (${me.schoolId}, ${s.id}, ${term}, ${`INV-${String(n.n).padStart(5, "0")}`}, ${total}, ${sql.json(lines)}, ${me.id}) ON CONFLICT DO NOTHING`;
    made++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "fees.invoices.generate", entity: "fee_invoice", meta: { made } });
  done();
  return { ok: `${made} invoice${made === 1 ? "" : "s"} created.` };
}

/** Records money received at the school office, issues a numbered receipt and books it as school-fees income. */
export async function recordPayment(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("fees:manage");
  const id = clean(fd.get("invoice"), 40), amount = Number(fd.get("amount")), method = clean(fd.get("method"), 10);
  const date = clean(fd.get("date"), 10);
  if (!UUID.test(id)) return { error: "Invoice not found." };
  if (!["cash", "transfer", "pos", "cheque", "other"].includes(method)) return { error: "Choose how it was paid." };
  const [inv] = await sql`SELECT id, total, paid, number FROM fee_invoices WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!inv) return { error: "Invoice not found." };
  const balance = Number(inv.total) - Number(inv.paid);
  if (!(amount > 0)) return { error: "Enter the amount received." };
  if (amount > balance + 0.001) return { error: `That is more than the balance of ₦${balance.toLocaleString("en-NG")}.` };
  const [n] = await sql`SELECT coalesce(max(substring(receipt_no from '[0-9]+$')::int), 0) + 1 AS n FROM fee_payments WHERE school_id = ${me.schoolId}`;
  const receipt = `RCT-${String(n.n).padStart(5, "0")}`;
  const [p] = await sql`INSERT INTO fee_payments (school_id, invoice_id, receipt_no, amount, method, reference, paid_on, received_by)
    VALUES (${me.schoolId}, ${id}, ${receipt}, ${amount}, ${method}, ${clean(fd.get("reference"), 60) || null}, ${DATE.test(date) ? date : new Date().toISOString().slice(0, 10)}, ${me.id}) RETURNING id`;
  await sql`UPDATE fee_invoices SET paid = paid + ${amount} WHERE id = ${id}`;
  await post({ schoolId: me.schoolId, description: `School fees ${inv.number} (${receipt})`, debit: "1000", credit: "4000", amount, ref: `fee:${p.id}`, by: me.id, payee: "Fees received", method, source: "fees" });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "fees.payment", entity: "fee_payment", entityId: p.id, meta: { amount, receipt } });
  done();
  return { ok: `${receipt} issued for ₦${amount.toLocaleString("en-NG")}.` };
}
