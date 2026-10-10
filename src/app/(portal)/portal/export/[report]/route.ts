import { NextResponse } from "next/server";
import { getMe, can } from "@/lib/auth";
import { sql } from "@/lib/db";
import { toCsv } from "@/lib/data";
import { audit } from "@/lib/security";
import { teacherClassIds, wideScope } from "@/lib/scope";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(req: Request, ctx: { params: Promise<{ report: string }> }) {
  const me = await getMe();
  if (!me || !me.mfaPassed || me.role === "student" || me.role === "parent") return new NextResponse("Not permitted", { status: 403 });
  const { report } = await ctx.params;
  const u = new URL(req.url);
  const cls = u.searchParams.get("class") ?? "", subj = u.searchParams.get("subject") ?? "", term = u.searchParams.get("term") ?? "", status = u.searchParams.get("status") ?? "";
  let rows: Record<string, unknown>[] = [];

  if (report === "students" && can(me, "students:export")) {
    const scoped = wideScope(me) ? null : await teacherClassIds(me.id);
    rows = await sql`SELECT s.admission_no, s.first_name, s.middle_name, s.last_name, s.gender, s.dob, c.name AS class, c.arm, d.name AS department, s.status, s.guardian_name, s.guardian_phone, s.guardian_email
      FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN departments d ON d.id = c.department_id
      WHERE s.school_id = ${me.schoolId} ${UUID.test(cls) ? sql`AND s.class_id = ${cls}` : sql``} ${status ? sql`AND s.status = ${status}` : sql``}
        ${scoped ? sql`AND s.class_id = ANY(${scoped})` : sql``} ORDER BY s.last_name, s.first_name`;
  } else if (report === "results" && (can(me, "reports:export") || can(me, "results:export") || can(me, "results:edit"))) {
    if (!UUID.test(cls) || !UUID.test(term)) return new NextResponse("class and term required", { status: 400 });
    if (!wideScope(me) && !(await teacherClassIds(me.id)).includes(cls)) return new NextResponse("Not permitted", { status: 403 });
    rows = await sql`SELECT s.admission_no, s.last_name, s.first_name, sub.name AS subject, r.assignment, r.ca, r.exam, r.total, r.grade, r.remark, r.teacher_remark, r.released
      FROM results r JOIN students s ON s.id = r.student_id JOIN subjects sub ON sub.id = r.subject_id
      WHERE r.school_id = ${me.schoolId} AND r.class_id = ${cls} AND r.term_id = ${term} ${UUID.test(subj) ? sql`AND r.subject_id = ${subj}` : sql``}
      ORDER BY s.last_name, sub.name`;
  } else if (report === "questions" && can(me, "questions:export")) {
    rows = await sql`SELECT s.name AS subject, q.topic, q.text AS question, q.options::text AS options, q.correct, q.explanation, q.difficulty, q.marks, q.status, q.copyright, q.source
      FROM questions q LEFT JOIN subjects s ON s.id = q.subject_id WHERE q.school_id = ${me.schoolId} ORDER BY q.created_at DESC LIMIT 5000`;
  } else if (report === "comments" && can(me, "comments:edit")) {
    rows = await sql`SELECT created_at, name, email, phone, category, subject, message, status, reply FROM contact_messages WHERE school_id = ${me.schoolId} ORDER BY created_at DESC`;
  } else if (report === "audit" && can(me, "audit:export")) {
    rows = await sql`SELECT created_at, category, actor_label, action, entity, entity_id, ip, meta::text AS meta FROM audit_logs WHERE school_id = ${me.schoolId} ORDER BY id DESC LIMIT 20000`;
  } else return new NextResponse("Not permitted", { status: 403 });

  await audit({ schoolId: me.schoolId, actorId: me.id, action: "report.export", entity: report, meta: { rows: rows.length } });
  return new NextResponse("﻿" + toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fodan-${report}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
