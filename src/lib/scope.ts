import { sql } from "./db";
import type { Me } from "./auth";

const WIDE_ROLES = ["developer", "super_admin", "academic_admin", "hr_admin", "student_affairs_admin", "content_admin", "finance_admin", "proprietor", "principal", "vp_admin", "vp_academics", "hod", "senior_staff", "exam_officer", "ict_officer"];

export function wideScope(me: Me): boolean {
  return me.roles.some((r) => WIDE_ROLES.includes(r)) || me.perms.has("*");
}

/** Classes a teacher is responsible for (class teacher or subject teacher). */
export async function teacherClassIds(userId: string): Promise<string[]> {
  const rows = await sql`
    SELECT id FROM classes WHERE class_teacher_id = ${userId} AND NOT archived
    UNION SELECT class_id FROM class_subjects WHERE teacher_id = ${userId}`;
  return rows.map((r) => r.id as string);
}

export async function childIds(parentId: string, activeOnly = true): Promise<string[]> {
  const rows = await sql`SELECT student_id FROM parent_links WHERE parent_id = ${parentId} ${activeOnly ? sql`AND status = 'active'` : sql``}`;
  return rows.map((r) => r.student_id as string);
}

export async function studentOf(userId: string) {
  const [s] = await sql`SELECT s.*, c.name AS class_name, c.arm AS class_arm, c.level AS class_level, d.name AS dept_name
                         FROM students s LEFT JOIN classes c ON c.id = s.class_id LEFT JOIN departments d ON d.id = s.department_id
                         WHERE s.user_id = ${userId}`;
  return s ?? null;
}

/** Can this user look at this student's records? (IDOR guard used everywhere.) */
export async function canSeeStudent(me: Me, studentId: string): Promise<boolean> {
  if (me.role === "student") {
    const [s] = await sql`SELECT 1 FROM students WHERE id = ${studentId} AND user_id = ${me.id}`;
    return !!s;
  }
  if (me.role === "parent") return (await childIds(me.id)).includes(studentId);
  if (wideScope(me)) return me.perms.has("students:view") || me.perms.has("*");
  const classes = await teacherClassIds(me.id);
  if (classes.length === 0) return false;
  const [s] = await sql`SELECT 1 FROM students WHERE id = ${studentId} AND class_id = ANY(${classes})`;
  return !!s;
}

export async function isClassTeacherOf(userId: string, classId: string): Promise<boolean> {
  const [r] = await sql`SELECT 1 FROM classes WHERE id = ${classId} AND class_teacher_id = ${userId} AND NOT archived`;
  return !!r;
}

/** Wednesday-style weekday index (0 = Monday) and date in West Africa Time. */
export function watToday(): { dow: number; day: string; minutes: number } {
  const d = new Date(Date.now() + 3600e3);
  return { dow: (d.getUTCDay() + 6) % 7, day: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

/** "8:00 – 8:40" -> minutes since midnight. Hours before 7 are afternoon (1:00 = 13:00). */
export function periodWindow(label: string): { start: number; end: number } | null {
  const m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(label);
  if (!m) return null;
  const h = (x: string) => { const n = Number(x); return n < 7 ? n + 12 : n; };
  return { start: h(m[1]) * 60 + Number(m[2]), end: h(m[3]) * 60 + Number(m[4]) };
}
