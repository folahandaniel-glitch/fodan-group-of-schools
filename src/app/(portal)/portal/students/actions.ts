"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { encrypt, lookupHash } from "@/lib/crypto";
import { generateAccessCode } from "@/lib/logic/access-code";
import { issueResetToken } from "@/lib/accounts";

type State = { error?: string; ok?: string };

async function newCode(): Promise<{ plain: string; hash: string; enc: string }> {
  for (let i = 0; i < 5; i++) {
    const plain = generateAccessCode();
    const hash = lookupHash(plain);
    const [dup] = await sql`SELECT 1 FROM students WHERE code_hash = ${hash}`;
    if (!dup) return { plain, hash, enc: encrypt(plain) };
  }
  throw new Error("Could not generate a unique code");
}

export async function enrolStudent(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("students:create");
  const first = clean(fd.get("firstName"), 80), last = clean(fd.get("lastName"), 80);
  const adm = clean(fd.get("admissionNo"), 40);
  const classId = clean(fd.get("classId"), 40) || null;
  if (!first || !last || !adm) return { error: "First name, last name and admission number are required." };
  const [dup] = await sql`SELECT 1 FROM students WHERE school_id = ${me.schoolId} AND lower(admission_no) = ${adm.toLowerCase()}`;
  if (dup) return { error: "A student with this admission number already exists." };
  let deptId: string | null = null;
  if (classId) {
    const [c] = await sql`SELECT department_id FROM classes WHERE id = ${classId} AND school_id = ${me.schoolId}`;
    if (!c) return { error: "Choose a valid class." };
    deptId = c.department_id;
  }
  const code = await newCode();
  const [s] = await sql`INSERT INTO students (school_id, admission_no, first_name, middle_name, last_name, dob, gender, class_id, department_id,
      guardian_name, guardian_phone, guardian_email, admission_year, code_hash, code_enc)
    VALUES (${me.schoolId}, ${adm}, ${first}, ${clean(fd.get("middleName"), 80) || null}, ${last}, ${clean(fd.get("dob"), 10) || null}, ${clean(fd.get("gender"), 12) || null},
      ${classId}, ${deptId}, ${clean(fd.get("guardianName"), 120) || null}, ${clean(fd.get("guardianPhone"), 30) || null}, ${clean(fd.get("guardianEmail"), 200).toLowerCase() || null},
      ${new Date().getFullYear()}, ${code.hash}, ${code.enc}) RETURNING id`;
  await sql`INSERT INTO student_history (school_id, student_id, action, to_class_id, to_department_id, by_user, remarks)
            VALUES (${me.schoolId}, ${s.id}, 'enrol', ${classId}, ${deptId}, ${me.id}, 'Initial enrolment')`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "student.create", entity: "student", entityId: s.id });
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "access_code.generate", entity: "student", entityId: s.id });
  redirect(`/portal/students/${s.id}`);
}

export async function codeAction(fd: FormData): Promise<void> {
  const me = await requirePerm("access_codes:manage");
  const id = clean(fd.get("id"), 40);
  const op = clean(fd.get("op"), 20);
  const [s] = await sql`SELECT id, user_id FROM students WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!s) return;
  if (op === "regenerate") {
    const code = await newCode();
    await sql`UPDATE students SET code_hash = ${code.hash}, code_enc = ${code.enc}, code_status = 'active' WHERE id = ${id}`;
    await audit({ schoolId: me.schoolId, actorId: me.id, action: "access_code.regenerate", entity: "student", entityId: id });
  } else if (op === "revoke" || op === "suspend") {
    await sql`UPDATE students SET code_status = ${op === "revoke" ? "revoked" : "suspended"} WHERE id = ${id}`;
    if (s.user_id) {
      await sql`UPDATE users SET status = 'suspended' WHERE id = ${s.user_id}`;
      await sql`DELETE FROM sessions WHERE user_id = ${s.user_id}`;
    }
    await audit({ schoolId: me.schoolId, actorId: me.id, action: `access_code.${op}`, entity: "student", entityId: id });
  } else if (op === "restore") {
    await sql`UPDATE students SET code_status = 'active' WHERE id = ${id}`;
    if (s.user_id) await sql`UPDATE users SET status = 'active' WHERE id = ${s.user_id}`;
    await audit({ schoolId: me.schoolId, actorId: me.id, action: "access_code.restore", entity: "student", entityId: id });
  }
  revalidatePath(`/portal/students/${id}`);
}

export async function linkDecision(fd: FormData): Promise<void> {
  const me = await requirePerm("students:edit");
  const parent = clean(fd.get("parent"), 40), student = clean(fd.get("student"), 40), op = clean(fd.get("op"), 10);
  const [s] = await sql`SELECT id FROM students WHERE id = ${student} AND school_id = ${me.schoolId}`;
  if (!s) return;
  if (op === "approve") await sql`UPDATE parent_links SET status = 'active' WHERE parent_id = ${parent} AND student_id = ${student}`;
  else await sql`DELETE FROM parent_links WHERE parent_id = ${parent} AND student_id = ${student}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `parent.link.${op}`, entity: "student", entityId: student });
  revalidatePath(`/portal/students/${student}`);
}

export async function setStudentStatus(fd: FormData): Promise<void> {
  const me = await requirePerm("students:archive");
  const id = clean(fd.get("id"), 40), status = clean(fd.get("status"), 20);
  if (!["active", "withdrawn", "graduated", "archived", "transferred"].includes(status)) return;
  const [s] = await sql`SELECT user_id, class_id FROM students WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!s) return;
  await sql`UPDATE students SET status = ${status} WHERE id = ${id}`;
  if (s.user_id && status !== "active") {
    await sql`UPDATE users SET status = 'suspended' WHERE id = ${s.user_id}`;
    await sql`DELETE FROM sessions WHERE user_id = ${s.user_id}`;
  } else if (s.user_id) await sql`UPDATE users SET status = 'active' WHERE id = ${s.user_id}`;
  await sql`INSERT INTO student_history (school_id, student_id, action, from_class_id, by_user, remarks) VALUES (${me.schoolId}, ${id}, ${status}, ${s.class_id}, ${me.id}, ${clean(fd.get("remarks"), 300) || null})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `student.${status}`, entity: "student", entityId: id });
  revalidatePath(`/portal/students/${id}`);
}

export async function updateStudent(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("students:edit");
  const id = clean(fd.get("id"), 40);
  const [before] = await sql`SELECT first_name, last_name, dob, guardian_name, guardian_phone, guardian_email, address FROM students WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!before) return { error: "Student not found." };
  await sql`UPDATE students SET first_name = ${clean(fd.get("firstName"), 80)}, last_name = ${clean(fd.get("lastName"), 80)},
      dob = ${clean(fd.get("dob"), 10) || null}, gender = ${clean(fd.get("gender"), 12) || null},
      guardian_name = ${clean(fd.get("guardianName"), 120) || null}, guardian_phone = ${clean(fd.get("guardianPhone"), 30) || null},
      guardian_email = ${clean(fd.get("guardianEmail"), 200).toLowerCase() || null}, address = ${clean(fd.get("address"), 300) || null}
    WHERE id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "student.update", entity: "student", entityId: id, meta: { before } });
  return { ok: "Student updated." };
}

/** Generates a one-time reset link. The existing password is never shown to anyone. */
export async function makeResetLink(_p: State & { link?: string }, fd: FormData): Promise<State & { link?: string }> {
  const me = await requirePerm("users:manage");
  const userId = clean(fd.get("userId"), 40);
  const [u] = await sql`SELECT id, school_id, role FROM users WHERE id = ${userId} AND school_id = ${me.schoolId}`;
  if (!u) return { error: "User not found." };
  if (u.role === "super_admin" && me.role !== "super_admin") return { error: "Not permitted." };
  const raw = await issueResetToken(u.id, me.id, 60);
  await sql`DELETE FROM sessions WHERE user_id = ${u.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "password.reset.issued", entity: "user", entityId: u.id });
  return { ok: "One-time link (valid 60 minutes). Share it only with the account owner.", link: `${process.env.APP_BASE_URL || ""}/reset/${raw}` };
}
