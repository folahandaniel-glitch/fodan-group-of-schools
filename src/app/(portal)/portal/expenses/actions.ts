"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { ensureAccounts, post } from "@/lib/ledger";
import { saveUpload } from "@/lib/files";

type State = { error?: string; ok?: string };
const METHODS = ["cash", "transfer", "pos", "cheque", "other"];

/** Every naira spent on running the school is recorded here with who, to whom, how and the receipt. Entries are permanent; mistakes are corrected by a reversing entry. */
export async function recordExpense(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("expenses:manage");
  await ensureAccounts(me.schoolId);
  const code = clean(fd.get("category"), 10), amount = Number(fd.get("amount"));
  const payee = clean(fd.get("payee"), 120), desc = clean(fd.get("description"), 240);
  const method = clean(fd.get("method"), 10), ref = clean(fd.get("reference"), 60), date = clean(fd.get("date"), 10);
  if (!payee || !desc || !(amount > 0)) return { error: "Enter who was paid, what it was for and a positive amount." };
  if (!METHODS.includes(method)) return { error: "Choose how it was paid." };
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  if (day > new Date(Date.now() + 86400e3).toISOString().slice(0, 10)) return { error: "The date cannot be in the future." };
  const [a] = await sql`SELECT code, name FROM ledger_accounts WHERE school_id = ${me.schoolId} AND code = ${code} AND kind = 'expense'`;
  if (!a) return { error: "Choose an expense category." };
  let receipt: string | null = null;
  const f = fd.get("receipt") as File | null;
  if (f && f.size > 0) {
    const r = await saveUpload(f, { schoolId: me.schoolId, userId: me.id, allow: ["pdf", "png", "jpg", "jpeg", "webp"] });
    if (!r.ok) return { error: r.error };
    receipt = r.id;
  }
  const entryRef = `expense:${randomUUID()}`;
  await post({ schoolId: me.schoolId, description: `${desc}${ref ? ` (ref ${ref})` : ""}`, debit: code, credit: "1000", amount, ref: entryRef, by: me.id, date: day, payee, method, receiptFile: receipt, source: "manual" });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "expense.record", entity: "ledger", meta: { amount, category: a.name, payee } });
  revalidatePath("/portal/expenses");
  revalidatePath("/portal/ledger");
  return { ok: `₦${amount.toLocaleString("en-NG")} recorded under ${a.name}.` };
}
