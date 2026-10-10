"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };

export async function createClass(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("classes:create");
  const name = clean(fd.get("name"), 60), arm = clean(fd.get("arm"), 20), level = Number(fd.get("level"));
  if (!name || !(level >= 1 && level <= 12)) return { error: "Enter a class name and a level between 1 and 12." };
  const sectionName = level <= 6 ? "Primary" : level <= 9 ? "Junior Secondary" : "Senior Secondary";
  const [sec] = await sql`SELECT id FROM sections WHERE school_id = ${me.schoolId} AND name = ${sectionName}`;
  const dept = uuid(fd.get("departmentId"));
  const [r] = await sql`INSERT INTO classes (school_id, section_id, level, name, arm, department_id) VALUES (${me.schoolId}, ${sec?.id ?? null}, ${level}, ${name}, ${arm}, ${dept}) RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "class.create", entity: "class", entityId: r.id });
  revalidatePath("/portal/classes");
  return { ok: "Class created." };
}

export async function renameClass(fd: FormData): Promise<void> {
  const me = await requirePerm("classes:edit");
  const id = uuid(fd.get("id"));
  if (!id) return;
  await sql`UPDATE classes SET name = ${clean(fd.get("name"), 60)}, arm = ${clean(fd.get("arm"), 20)} WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "class.rename", entity: "class", entityId: id });
  revalidatePath("/portal/classes");
}

export async function archiveClass(fd: FormData): Promise<void> {
  const me = await requirePerm("classes:archive");
  const id = uuid(fd.get("id"));
  if (!id) return;
  const archive = fd.get("restore") ? false : true;
  await sql`UPDATE classes SET archived = ${archive} WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: archive ? "class.archive" : "class.restore", entity: "class", entityId: id });
  revalidatePath("/portal/classes");
}

async function syncClassTeacherRole(userId: string | null): Promise<void> {
  if (!userId) return;
  await sql`UPDATE users SET role = CASE
      WHEN role = 'teacher' AND EXISTS (SELECT 1 FROM classes WHERE class_teacher_id = ${userId} AND NOT archived) THEN 'class_teacher'
      WHEN role = 'class_teacher' AND NOT EXISTS (SELECT 1 FROM classes WHERE class_teacher_id = ${userId} AND NOT archived) THEN 'teacher'
      ELSE role END WHERE id = ${userId}`;
}

/** Assigns (or transfers) the class teacher. The teacher's profile is untouched; history goes to teacher_transfers. */
export async function setClassTeacher(fd: FormData): Promise<void> {
  const me = await requirePerm("classes:assign");
  const classId = uuid(fd.get("classId"));
  const teacher = uuid(fd.get("teacherId"));
  if (!classId) return;
  const [c] = await sql`SELECT class_teacher_id FROM classes WHERE id = ${classId} AND school_id = ${me.schoolId}`;
  if (!c) return;
  let prevClass: string | null = null;
  if (teacher) {
    const [t] = await sql`SELECT 1 FROM users WHERE id = ${teacher} AND school_id = ${me.schoolId} AND role NOT IN ('student','parent') AND status = 'active'`;
    if (!t) return;
    const [prev] = await sql`SELECT id FROM classes WHERE class_teacher_id = ${teacher} AND id <> ${classId} AND NOT archived`;
    if (prev) {
      prevClass = prev.id;
      await sql`UPDATE classes SET class_teacher_id = NULL WHERE id = ${prev.id}`;
    }
    await sql`INSERT INTO teacher_transfers (school_id, teacher_id, kind, from_class_id, to_class_id, by_user, remarks)
              VALUES (${me.schoolId}, ${teacher}, 'class_teacher', ${prevClass}, ${classId}, ${me.id}, ${clean(fd.get("remarks"), 200) || null})`;
  }
  await sql`UPDATE classes SET class_teacher_id = ${teacher} WHERE id = ${classId}`;
  await syncClassTeacherRole(teacher);
  if (c.class_teacher_id && c.class_teacher_id !== teacher) await syncClassTeacherRole(c.class_teacher_id);
  await audit({ schoolId: me.schoolId, actorId: me.id, action: teacher ? "teacher.transfer" : "teacher.unassign", entity: "class", entityId: classId, meta: { teacher, fromClass: prevClass, replaced: c.class_teacher_id } });
  revalidatePath("/portal/classes");
}
export async function assignSubject(fd: FormData): Promise<void> {
  const me = await requirePerm("subjects:assign");
  const classId = uuid(fd.get("classId")), subjectId = uuid(fd.get("subjectId")), teacher = uuid(fd.get("teacherId"));
  if (!classId || !subjectId) return;
  const [ok] = await sql`SELECT 1 FROM classes WHERE id = ${classId} AND school_id = ${me.schoolId}`;
  if (!ok) return;
  const [prev] = await sql`SELECT teacher_id FROM class_subjects WHERE class_id = ${classId} AND subject_id = ${subjectId}`;
  await sql`INSERT INTO class_subjects (class_id, subject_id, teacher_id) VALUES (${classId}, ${subjectId}, ${teacher})
            ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id`;
  if (prev?.teacher_id !== teacher && teacher) {
    await sql`INSERT INTO teacher_transfers (school_id, teacher_id, kind, from_class_id, to_class_id, subject_id, by_user)
              VALUES (${me.schoolId}, ${teacher}, 'subject', NULL, ${classId}, ${subjectId}, ${me.id})`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "subject.assign", entity: "class", entityId: classId, meta: { subjectId, teacher } });
  revalidatePath("/portal/classes");
}

export async function removeClassSubject(fd: FormData): Promise<void> {
  const me = await requirePerm("subjects:assign");
  const classId = uuid(fd.get("classId")), subjectId = uuid(fd.get("subjectId"));
  if (!classId || !subjectId) return;
  await sql`DELETE FROM class_subjects WHERE class_id = ${classId} AND subject_id = ${subjectId}
            AND EXISTS (SELECT 1 FROM classes WHERE id = ${classId} AND school_id = ${me.schoolId})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "subject.unassign", entity: "class", entityId: classId, meta: { subjectId } });
  revalidatePath("/portal/classes");
}

export async function createSubject(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("subjects:create");
  const name = clean(fd.get("name"), 100);
  if (!name) return { error: "Enter a subject name." };
  try {
    await sql`INSERT INTO subjects (school_id, name, code, department_id) VALUES (${me.schoolId}, ${name}, ${clean(fd.get("code"), 12) || null}, ${uuid(fd.get("departmentId"))})`;
  } catch {
    return { error: "A subject with that name already exists." };
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "subject.create", meta: { name } });
  revalidatePath("/portal/classes");
  return { ok: "Subject added." };
}

export async function createDepartment(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("classes:manage");
  const name = clean(fd.get("name"), 80);
  if (!name) return { error: "Enter a department name." };
  try {
    await sql`INSERT INTO departments (school_id, name, head_id) VALUES (${me.schoolId}, ${name}, ${uuid(fd.get("headId"))})`;
  } catch {
    return { error: "That department already exists." };
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "department.create", meta: { name } });
  revalidatePath("/portal/classes");
  return { ok: "Department added." };
}

export async function setDepartmentHead(fd: FormData): Promise<void> {
  const me = await requirePerm("classes:manage");
  const id = uuid(fd.get("id"));
  const head = uuid(fd.get("headId"));
  if (!id) return;
  await sql`UPDATE departments SET head_id = ${head} WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (head) {
    await sql`INSERT INTO user_roles (user_id, role) SELECT ${head}, 'hod' WHERE EXISTS (SELECT 1 FROM users WHERE id = ${head} AND school_id = ${me.schoolId}) ON CONFLICT DO NOTHING`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "department.head", entity: "department", entityId: id, meta: { head } });
  revalidatePath("/portal/classes");
}
