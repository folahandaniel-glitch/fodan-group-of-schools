import { NextResponse } from "next/server";
import { getMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { toCsv } from "@/lib/data";
import { audit } from "@/lib/security";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { isRoot } from "@/lib/logic/permissions";
import { hideDevAudit } from "@/lib/visibility";
import { buildXlsx, XLSX_MIME } from "@/lib/xlsx";
import { decrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
type Rows = Record<string, unknown>[];

export async function GET(req: Request, ctx: { params: Promise<{ report: string }> }) {
  const me = await getMe();
  if (!me || !me.mfaPassed || me.role === "student" || me.role === "parent") return new NextResponse("Not permitted", { status: 403 });
  const { report } = await ctx.params;
  const u = new URL(req.url);
  const q = (k: string) => u.searchParams.get(k) ?? "";
  const cls = q("class"), subj = q("subject"), term = q("term"), status = q("status");
  const today = new Date().toISOString().slice(0, 10);
  const from = DATE.test(q("from")) ? q("from") : new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const to = DATE.test(q("to")) ? q("to") : today;
  const root = isRoot(me.role);
  const hr = root || can(me, "hrm:manage") || can(me, "attendance:manage") || can(me, "clock:manage");
  const S = me.schoolId;
  const myClasses = wideScope(me) ? null : await teacherClassIds(me.id);
  const classFilter = (col: ReturnType<typeof sql>) => (myClasses ? sql`AND ${col} = ANY(${myClasses})` : sql``);
  let sheets: { name: string; rows: Rows }[] = [];
  const deny = () => new NextResponse("Not permitted", { status: 403 });

  if (report === "students") {
    if (!root && !can(me, "students:export")) return deny();
    sheets = [{ name: "Students", rows: await sql`SELECT s.admission_no, s.first_name, s.middle_name, s.last_name, s.gender, s.dob, c.name AS class, c.arm, d.name AS department, s.status, s.guardian_name, s.guardian_phone, s.guardian_email
      FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN departments d ON d.id = c.department_id
      WHERE s.school_id = ${S} ${UUID.test(cls) ? sql`AND s.class_id = ${cls}` : sql``} ${status ? sql`AND s.status = ${status}` : sql``}
        ${myClasses ? sql`AND s.class_id = ANY(${myClasses})` : sql``} ORDER BY c.name, s.last_name, s.first_name` }];
  } else if (report === "access-codes") {
    if (!root && !can(me, "access_codes:manage")) return deny();
    const rows = await sql`SELECT s.admission_no, s.last_name, s.first_name, c.name AS class, c.arm, s.code_enc, s.code_status, s.code_batch, to_char(s.code_valid_from, 'YYYY-MM-DD') AS vf, to_char(s.code_expires_on, 'YYYY-MM-DD') AS vt FROM students s LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.school_id = ${S} AND s.code_enc IS NOT NULL ${UUID.test(cls) ? sql`AND s.class_id = ${cls}` : sql``} ${myClasses ? sql`AND s.class_id = ANY(${myClasses})` : sql``} ORDER BY c.name, s.last_name`;
    sheets = [{ name: "Access codes", rows: rows.map((r) => ({ admission_no: r.admission_no, last_name: r.last_name, first_name: r.first_name, class: `${r.class ?? ""}${r.arm ?? ""}`, access_code: (() => { try { return decrypt(r.code_enc as string); } catch { return ""; } })(), status: r.code_status, batch: r.code_batch ?? "", valid_from: r.vf ?? "", valid_until: r.vt ?? "" })) }];
  } else if (report === "student-attendance") {
    if (!root && !can(me, "attendance:export") && !can(me, "attendance:view")) return deny();
    sheets = [{ name: "Student attendance", rows: await sql`SELECT a.day, c.name AS class, c.arm, s.admission_no, s.last_name, s.first_name, a.status
      FROM attendance a JOIN students s ON s.id = a.subject_ref JOIN classes c ON c.id = s.class_id
      WHERE a.school_id = ${S} AND a.kind = 'student' AND a.day BETWEEN ${from} AND ${to} ${UUID.test(cls) ? sql`AND s.class_id = ${cls}` : sql``} ${classFilter(sql`s.class_id`)}
      ORDER BY a.day, c.name, s.last_name` }];
  } else if (report === "staff-attendance") {
    if (!hr) return deny();
    sheets = [
      { name: "Clock in-out", rows: await sql`SELECT c.day, u.last_name, u.first_name, p.position, b.name AS branch,
          to_char(c.clock_in AT TIME ZONE 'Africa/Lagos', 'HH24:MI') AS clock_in, to_char(c.clock_out AT TIME ZONE 'Africa/Lagos', 'HH24:MI') AS clock_out, c.late_minutes, c.in_dist_m AS metres_from_branch
        FROM clock_entries c JOIN users u ON u.id = c.user_id LEFT JOIN staff_profiles p ON p.user_id = u.id LEFT JOIN branches b ON b.id = c.branch_id
        WHERE c.school_id = ${S} AND u.role <> 'developer' AND c.day BETWEEN ${from} AND ${to} ORDER BY c.day, u.last_name` },
      { name: "Daily register", rows: await sql`SELECT a.day, u.last_name, u.first_name, a.status FROM attendance a JOIN users u ON u.id = a.subject_ref
        WHERE a.school_id = ${S} AND a.kind = 'staff' AND u.role <> 'developer' AND a.day BETWEEN ${from} AND ${to} ORDER BY a.day, u.last_name` },
    ];
  } else if (report === "period-registers") {
    const own = !hr;
    if (own && !can(me, "timetable:view") && !can(me, "timetable:edit")) return deny();
    sheets = [{ name: "Subject periods", rows: await sql`SELECT r.day, r.period, c.name AS class, c.arm, s.name AS subject, u.last_name AS teacher_surname, u.first_name AS teacher_first_name,
        r.status, to_char(r.registered_at AT TIME ZONE 'Africa/Lagos', 'HH24:MI') AS registered_at, r.note
      FROM period_registers r JOIN users u ON u.id = r.teacher_id JOIN classes c ON c.id = r.class_id LEFT JOIN subjects s ON s.id = r.subject_id
      WHERE r.school_id = ${S} AND u.role <> 'developer' AND r.day BETWEEN ${from} AND ${to} ${own ? sql`AND r.teacher_id = ${me.id}` : sql``} ORDER BY r.day, r.period` }];
  } else if (report === "timetable") {
    if (!can(me, "timetable:view") && !can(me, "timetable:edit")) return deny();
    sheets = [{ name: "Timetable", rows: await sql`SELECT c.name AS class, c.arm, (ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'])[t.day + 1] AS day, t.period, s.name AS subject, u.last_name AS teacher_surname, u.first_name AS teacher_first_name, t.room,
        CASE WHEN t.published THEN 'published' ELSE 'draft' END AS state
      FROM timetable_slots t JOIN classes c ON c.id = t.class_id LEFT JOIN subjects s ON s.id = t.subject_id LEFT JOIN users u ON u.id = t.teacher_id
      WHERE t.school_id = ${S} ${UUID.test(cls) ? sql`AND t.class_id = ${cls}` : sql``} ORDER BY c.name, t.day, t.period` }];
  } else if (report === "results") {
    if (!root && !(can(me, "reports:export") || can(me, "results:export") || can(me, "results:edit"))) return deny();
    if (!UUID.test(cls) || !UUID.test(term)) return new NextResponse("class and term required", { status: 400 });
    if (myClasses && !myClasses.includes(cls)) return deny();
    sheets = [{ name: "Results", rows: await sql`SELECT s.admission_no, s.last_name, s.first_name, sub.name AS subject, r.assignment, r.ca, r.exam, r.total, r.grade, r.remark, r.teacher_remark, r.released
      FROM results r JOIN students s ON s.id = r.student_id JOIN subjects sub ON sub.id = r.subject_id
      WHERE r.school_id = ${S} AND r.class_id = ${cls} AND r.term_id = ${term} ${UUID.test(subj) ? sql`AND r.subject_id = ${subj}` : sql``} ORDER BY s.last_name, sub.name` }];
  } else if (report === "staff") {
    if (!root && !can(me, "staff:export") && !can(me, "staff:view")) return deny();
    sheets = [{ name: "Staff", rows: await sql`SELECT u.last_name, u.first_name, u.email, u.phone, u.role, u.status, p.position, p.category, p.section, d.name AS department, b.name AS branch, p.employment_date, p.years_experience
      FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id LEFT JOIN departments d ON d.id = p.department_id LEFT JOIN branches b ON b.id = p.branch_id
      WHERE u.school_id = ${S} AND u.role NOT IN ('student','parent','developer') ORDER BY u.last_name` }];
  } else if (report === "fines") {
    if (!root && !can(me, "fines:view")) return deny();
    sheets = [{ name: "Fines", rows: await sql`SELECT f.day, u.last_name, u.first_name, f.reason, f.amount, f.status FROM fines f JOIN users u ON u.id = f.user_id
      WHERE f.school_id = ${S} AND u.role <> 'developer' AND f.day BETWEEN ${from} AND ${to} ORDER BY f.day DESC` }];
  } else if (report === "payroll") {
    if (!root && !can(me, "payroll:view")) return deny();
    const period = /^\d{4}-\d{2}$/.test(q("period")) ? q("period") : "";
    sheets = [{ name: "Payslips", rows: await sql`SELECT r.period, r.status AS run_status, u.last_name, u.first_name, p.gross AS base_salary, p.allowances, (p.gross + p.allowances) AS total_earnings,
        p.pension, p.tax, p.fines AS fines_and_discipline, p.advances, (p.pension + p.tax + p.fines + p.advances) AS total_deductions, p.net AS net_pay
      FROM payslips p JOIN payroll_runs r ON r.id = p.run_id JOIN users u ON u.id = p.user_id
      WHERE r.school_id = ${S} AND u.role <> 'developer' ${period ? sql`AND r.period = ${period}` : sql``} ORDER BY r.period DESC, u.last_name` }];
  } else if (report === "expenses") {
    if (!root && !can(me, "ledger:view") && !can(me, "expenses:view")) return deny();
    sheets = [{ name: "Expenses", rows: await sql`SELECT e.entry_date AS date, a.name AS category, e.description, e.payee, e.method, e.amount, e.ref AS reference, e.source,
        u.first_name || ' ' || u.last_name AS recorded_by, CASE WHEN e.receipt_file IS NULL THEN 'no' ELSE 'yes' END AS receipt_attached
      FROM ledger_entries e JOIN ledger_accounts a ON a.school_id = e.school_id AND a.code = e.debit_code AND a.kind = 'expense' LEFT JOIN users u ON u.id = e.created_by AND u.role <> 'developer'
      WHERE e.school_id = ${S} AND e.entry_date BETWEEN ${from} AND ${to} ORDER BY e.entry_date DESC, e.created_at DESC` }];
  } else if (report === "hr-cases") {
    if (!root && !can(me, "hrm:manage")) return deny();
    sheets = [{ name: "HR cases", rows: await sql`SELECT c.number, c.incident_on, u.last_name, u.first_name, r.title AS rule, c.kind, c.status, c.fine_amount, c.decision
      FROM hr_cases c JOIN users u ON u.id = c.user_id LEFT JOIN hr_rules r ON r.id = c.rule_id WHERE c.school_id = ${S} AND u.role <> 'developer' ORDER BY c.created_at DESC` }];
  } else if (report === "crm") {
    if (!root && !can(me, "crm:view")) return deny();
    sheets = [
      { name: "Accounts", rows: await sql`SELECT a.name, a.kind, a.status, a.phone, a.email, a.source, a.created_at FROM crm_accounts a WHERE a.school_id = ${S} ORDER BY a.name` },
      { name: "Opportunities", rows: await sql`SELECT a.name AS account, o.title, o.stage, o.value, o.expected_close, o.lost_reason FROM crm_opportunities o JOIN crm_accounts a ON a.id = o.account_id WHERE o.school_id = ${S} ORDER BY o.created_at DESC` },
    ];
  } else if (report === "questions") {
    if (!root && !can(me, "questions:export")) return deny();
    sheets = [{ name: "Questions", rows: await sql`SELECT s.name AS subject, q.topic, q.text AS question, q.options::text AS options, q.correct, q.explanation, q.difficulty, q.marks, q.status, q.copyright, q.source
      FROM questions q LEFT JOIN subjects s ON s.id = q.subject_id WHERE q.school_id = ${S} ORDER BY q.created_at DESC LIMIT 5000` }];
  } else if (report === "comments") {
    if (!root && !can(me, "comments:edit")) return deny();
    sheets = [{ name: "Messages", rows: await sql`SELECT created_at, name, email, phone, category, subject, message, status, reply FROM contact_messages WHERE school_id = ${S} ORDER BY created_at DESC` }];
  } else if (report === "audit") {
    if (!root && !can(me, "audit:export")) return deny();
    sheets = [{ name: "Audit", rows: await sql`SELECT created_at, category, actor_label, action, entity, entity_id, ip, meta::text AS meta FROM audit_logs WHERE school_id = ${S} ${hideDevAudit(me)} ORDER BY id DESC LIMIT 20000` }];
  } else return deny();

  const count = sheets.reduce((n, s) => n + s.rows.length, 0);
  // An empty report still opens as a readable sheet instead of a blank file.
  for (const sh of sheets) if (sh.rows.length === 0) sh.rows = [{ note: "No records for the selected filters." }];
  await audit({ schoolId: S, actorId: me.id, action: "report.export", entity: report, meta: { rows: count } });
  const stamp = new Date().toISOString().slice(0, 10);
  if (q("format") === "csv") {
    return new NextResponse("﻿" + toCsv(sheets[0]?.rows ?? []), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fodan-${report}-${stamp}.csv"`, "Cache-Control": "no-store" } });
  }
  const bytes = buildXlsx(sheets);
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": XLSX_MIME, "Content-Disposition": `attachment; filename="fodan-${report}-${stamp}.xlsx"`, "Cache-Control": "no-store" } });
}
