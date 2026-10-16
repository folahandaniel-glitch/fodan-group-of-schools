"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { getSetting, setSetting } from "@/lib/settings";
import { computePayslip, validPeriod } from "@/lib/logic/payroll";
import { post } from "@/lib/ledger";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };

export async function saveSalary(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("payroll:manage");
  const user = uuid(fd.get("user"));
  const gross = Number(fd.get("gross")), allow = Number(fd.get("allowances") || 0);
  if (!user || !(gross >= 0) || !(allow >= 0)) return { error: "Enter valid amounts." };
  const [u] = await sql`SELECT 1 FROM users WHERE id = ${user} AND school_id = ${me.schoolId} AND role NOT IN ('student','parent')`;
  if (!u) return { error: "Staff member not found." };
  await sql`INSERT INTO salary_profiles (user_id, school_id, gross_monthly, allowances, bank_name) VALUES (${user}, ${me.schoolId}, ${gross}, ${allow}, ${clean(fd.get("bank"), 80) || null})
            ON CONFLICT (user_id) DO UPDATE SET gross_monthly = EXCLUDED.gross_monthly, allowances = EXCLUDED.allowances, bank_name = EXCLUDED.bank_name, updated_at = now()`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "salary.set", entity: "user", entityId: user });
  revalidatePath("/portal/payroll");
  return { ok: "Salary saved." };
}

export async function saveRates(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("payroll:manage");
  const pct = (k: string) => Math.min(Math.max(Number(fd.get(k)) || 0, 0), 60);
  await setSetting("payroll", { pensionPct: pct("pensionPct"), taxPct: pct("taxPct") });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "payroll.rates" });
  revalidatePath("/portal/payroll");
  return { ok: "Rates saved." };
}

/** Builds a draft run: salary, statutory percentages and unpaid fines of the month. */
export async function generateRun(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("payroll:manage");
  const period = clean(fd.get("period"), 7);
  if (!validPeriod(period)) return { error: "Choose a month." };
  const [dup] = await sql`SELECT status FROM payroll_runs WHERE school_id = ${me.schoolId} AND period = ${period}`;
  if (dup) return { error: `A ${dup.status} run already exists for ${period}.` };
  const rates = (await getSetting<{ pensionPct: number; taxPct: number }>("payroll")) ?? { pensionPct: 0, taxPct: 0 };
  const [run] = await sql`INSERT INTO payroll_runs (school_id, period, created_by) VALUES (${me.schoolId}, ${period}, ${me.id}) RETURNING id`;
  const staff = await sql`SELECT s.user_id, s.gross_monthly, s.allowances FROM salary_profiles s JOIN users u ON u.id = s.user_id
                          WHERE s.school_id = ${me.schoolId} AND u.status = 'active' AND s.gross_monthly > 0`;
  const from = `${period}-01`;
  let n = 0;
  for (const s of staff) {
    const [f] = await sql`SELECT COALESCE(sum(amount), 0)::float AS total FROM fines WHERE user_id = ${s.user_id} AND status = 'applied'
                          AND day >= ${from}::date AND day < (${from}::date + interval '1 month')`;
    const slip = computePayslip({ gross: Number(s.gross_monthly), allowances: Number(s.allowances), pensionPct: rates.pensionPct, taxPct: rates.taxPct, fines: f.total });
    await sql`INSERT INTO payslips (run_id, user_id, gross, allowances, pension, tax, fines, advances, net, detail)
              VALUES (${run.id}, ${s.user_id}, ${slip.gross}, ${slip.allowances}, ${slip.pension}, ${slip.tax}, ${slip.fines}, ${slip.advances}, ${slip.net}, ${sql.json({ rates })})`;
    n++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "payroll.generate", entity: "payroll_run", entityId: run.id, meta: { period, staff: n } });
  revalidatePath("/portal/payroll");
  return { ok: `Draft run for ${period} created with ${n} payslips.` };
}

/** Separation of duties: the person who generated a run cannot approve it, and the approver cannot mark it paid. */
export async function advanceRun(fd: FormData): Promise<void> {
  const me = await requirePerm("payroll:view");
  const id = uuid(fd.get("id")), op = clean(fd.get("op"), 10);
  if (!id) return;
  const [r] = await sql`SELECT * FROM payroll_runs WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!r) return;
  if (op === "approve" && r.status === "draft") {
    await requirePerm("payroll:approve");
    if (r.created_by === me.id && me.role !== "super_admin") return;
    await sql`UPDATE payroll_runs SET status = 'approved', approved_by = ${me.id}, approved_at = now() WHERE id = ${id}`;
    await sql`INSERT INTO notifications (user_id, title, link) SELECT user_id, ${`Your ${r.period} payslip is ready`}, '/portal/payslips' FROM payslips WHERE run_id = ${id}`;
  } else if (op === "pay" && r.status === "approved") {
    await requirePerm("payroll:manage");
    if (r.approved_by === me.id && me.role !== "super_admin") return;
    await sql`UPDATE payroll_runs SET status = 'paid', paid_by = ${me.id}, paid_at = now() WHERE id = ${id}`;
    const [t] = await sql`SELECT COALESCE(sum(net), 0)::float AS net, COALESCE(sum(fines), 0)::float AS fines, COALESCE(sum(gross + allowances), 0)::float AS earnings FROM payslips WHERE run_id = ${id}`;
    await post({ schoolId: me.schoolId, description: `Payroll ${r.period} (net pay)`, debit: "5000", credit: "1000", amount: t.net, ref: `payroll:${id}:net`, by: me.id });
    await post({ schoolId: me.schoolId, description: `Payroll ${r.period} (deductions held)`, debit: "5000", credit: "2000", amount: Math.max(t.earnings - t.net, 0), ref: `payroll:${id}:ded`, by: me.id });
    // Fines that were deducted are no longer open.
    const from = `${r.period}-01`;
    await sql`UPDATE fines SET status = 'deducted' WHERE school_id = ${me.schoolId} AND status = 'applied' AND day >= ${from}::date AND day < (${from}::date + interval '1 month')
              AND user_id IN (SELECT user_id FROM payslips WHERE run_id = ${id})`;
  } else return;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `payroll.${op}`, entity: "payroll_run", entityId: id });
  revalidatePath("/portal/payroll");
}
