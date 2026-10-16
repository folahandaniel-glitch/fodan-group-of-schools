"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { post } from "@/lib/ledger";

type State = { error?: string; ok?: string };

export async function manualEntry(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("ledger:manage");
  const debit = clean(fd.get("debit"), 10), credit = clean(fd.get("credit"), 10), amount = Number(fd.get("amount"));
  const desc = clean(fd.get("description"), 200), date = clean(fd.get("date"), 10);
  if (!desc || !(amount > 0)) return { error: "Enter a description and a positive amount." };
  if (debit === credit) return { error: "Debit and credit accounts must differ." };
  const accts = await sql`SELECT code FROM ledger_accounts WHERE school_id = ${me.schoolId} AND code IN (${debit}, ${credit})`;
  if (accts.length !== 2) return { error: "Choose valid accounts." };
  await post({ schoolId: me.schoolId, description: desc, debit, credit, amount, ref: `manual:${randomUUID()}`, by: me.id, date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "ledger.entry", meta: { debit, credit, amount } });
  revalidatePath("/portal/ledger");
  return { ok: "Entry posted. Entries cannot be edited; correct a mistake with a reversing entry." };
}
