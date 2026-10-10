import { sql } from "./db";
import type { Me } from "./auth";

const WIDE_ROLES = ["super_admin", "proprietor", "principal", "vp_admin", "vp_academics", "hod", "senior_staff", "exam_officer", "ict_officer"];

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
