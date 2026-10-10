"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { teacherClassIds, wideScope } from "@/lib/scope";

type State = { error?: string; ok?: string };
const STUDENT = ["present", "absent", "late", "excused"];
const STAFF = ["present", "absent", "late", "leave"];

export async function markStudentAttendance(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("attendance:create");
  const classId = clean(fd.get("classId"), 40), day = clean(fd.get("day"), 10);
  if (!/^[0-9a-f-]{36}$/i.test(classId) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Choose a class and date." };
  if (!wideScope(me) && !(await teacherClassIds(me.id)).includes(classId)) return { error: "You are not assigned to this class." };
  const kids = await sql`SELECT id FROM students WHERE class_id = ${classId} AND school_id = ${me.schoolId} AND status IN ('active','enrolled')`;
  let n = 0;
  for (const k of kids) {
    const st = clean(fd.get(`a_${k.id}`), 10);
    if (!STUDENT.includes(st)) continue;
    await sql`INSERT INTO attendance (school_id, day, kind, subject_ref, status, marked_by) VALUES (${me.schoolId}, ${day}, 'student', ${k.id}, ${st}, ${me.id})
              ON CONFLICT (day, kind, subject_ref) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`;
    n++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "attendance.students", entity: "class", entityId: classId, meta: { day, count: n } });
  revalidatePath("/portal/attendance");
  return { ok: `Attendance saved for ${n} students.` };
}

export async function markStaffAttendance(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("staff:manage");
  if (!can(me, "attendance:edit") && !can(me, "attendance:manage")) return { error: "Not permitted." };
  const day = clean(fd.get("day"), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Choose a date." };
  const staff = await sql`SELECT id FROM users WHERE school_id = ${me.schoolId} AND role NOT IN ('student','parent') AND status = 'active'`;
  let n = 0;
  for (const s of staff) {
    const st = clean(fd.get(`a_${s.id}`), 10);
    if (!STAFF.includes(st)) continue;
    await sql`INSERT INTO attendance (school_id, day, kind, subject_ref, status, marked_by) VALUES (${me.schoolId}, ${day}, 'staff', ${s.id}, ${st}, ${me.id})
              ON CONFLICT (day, kind, subject_ref) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by`;
    n++;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "attendance.staff", meta: { day, count: n } });
  revalidatePath("/portal/attendance");
  return { ok: `Attendance saved for ${n} staff.` };
}
