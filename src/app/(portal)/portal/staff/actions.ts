"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { requirePerm, type Me } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { createUser, UserError } from "@/lib/accounts";
import { outranks, ROLES, STAFF_ROLES } from "@/lib/logic/permissions";
import { normEmail } from "@/lib/logic/password";
import { IMAGE_EXT, saveUpload } from "@/lib/files";

type State = { error?: string; ok?: string };

function strongRandom(): string {
  return `Aa1!${randomBytes(18).toString("base64url")}`;
}

function mayManage(me: Me, targetRole: string): boolean {
  return me.role === "super_admin" || outranks(me.role, targetRole);
}

export async function createStaff(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("staff:create");
  const role = clean(fd.get("role"), 30);
  if (!STAFF_ROLES.includes(role as never) || !mayManage(me, role)) return { error: "You cannot create an account with that role." };
  const email = normEmail(clean(fd.get("email"), 200));
  let uid: string;
  try {
    uid = await createUser({ schoolId: me.schoolId, email, password: strongRandom(), role, firstName: clean(fd.get("firstName"), 80),
      lastName: clean(fd.get("lastName"), 80), phone: clean(fd.get("phone"), 30), mustChange: true, actorId: me.id });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  await sql`INSERT INTO staff_profiles (user_id, school_id, employee_id, position, department_id, qualification, years_experience, employment_date)
            VALUES (${uid}, ${me.schoolId}, ${clean(fd.get("employeeId"), 40) || null}, ${clean(fd.get("position"), 100) || null},
                    ${clean(fd.get("departmentId"), 40) || null}, ${clean(fd.get("qualification"), 200) || null},
                    ${Number(fd.get("years")) || 0}, ${clean(fd.get("employmentDate"), 10) || null})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "staff.create", entity: "user", entityId: uid, meta: { role } });
  redirect(`/portal/staff/${uid}?created=1`);
}

export async function updateStaff(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("staff:edit");
  const id = clean(fd.get("id"), 40);
  const [u] = await sql`SELECT role FROM users WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!u || !mayManage(me, u.role) && me.id !== id) return { error: "Not permitted." };
  const photo = fd.get("photo") as File | null;
  let photoId: string | null = null;
  if (photo && photo.size > 0) {
    const r = await saveUpload(photo, { schoolId: me.schoolId, userId: me.id, allow: IMAGE_EXT, makePublic: true });
    if (!r.ok) return { error: r.error };
    photoId = r.id;
  }
  await sql`UPDATE users SET first_name = ${clean(fd.get("firstName"), 80)}, last_name = ${clean(fd.get("lastName"), 80)}, phone = ${clean(fd.get("phone"), 30) || null},
            photo_file = COALESCE(${photoId}, photo_file), updated_at = now() WHERE id = ${id}`;
  await sql`UPDATE staff_profiles SET employee_id = ${clean(fd.get("employeeId"), 40) || null}, position = ${clean(fd.get("position"), 100) || null},
      department_id = ${clean(fd.get("departmentId"), 40) || null}, qualification = ${clean(fd.get("qualification"), 200) || null},
      certification = ${clean(fd.get("certification"), 200) || null}, years_experience = ${Number(fd.get("years")) || 0},
      employment_date = ${clean(fd.get("employmentDate"), 10) || null}, specialization = ${clean(fd.get("specialization"), 200) || null},
      bio = ${clean(fd.get("bio"), 1500) || null}, subjects_text = ${clean(fd.get("subjectsText"), 300) || null},
      is_senior = ${fd.get("isSenior") === "on"}, public = ${fd.get("public") === "on"}, sort = ${Number(fd.get("sort")) || 100}
    WHERE user_id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "staff.update", entity: "user", entityId: id });
  revalidatePath(`/portal/staff/${id}`);
  return { ok: "Profile saved." };
}

export async function setStaffRole(fd: FormData): Promise<void> {
  const me = await requirePerm("roles:manage");
  const id = clean(fd.get("id"), 40), role = clean(fd.get("role"), 30);
  const [u] = await sql`SELECT role FROM users WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!u || !ROLES.includes(role as never) || role === "super_admin" || u.role === "super_admin") return;
  if (!mayManage(me, u.role) || !mayManage(me, role)) return;
  await sql`UPDATE users SET role = ${role} WHERE id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "role.change", entity: "user", entityId: id, meta: { from: u.role, to: role } });
  revalidatePath(`/portal/staff/${id}`);
}

export async function setStaffStatus(fd: FormData): Promise<void> {
  const me = await requirePerm("staff:archive");
  const id = clean(fd.get("id"), 40), op = clean(fd.get("op"), 12);
  const [u] = await sql`SELECT role FROM users WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!u || u.role === "super_admin" || !mayManage(me, u.role) || id === me.id) return;
  const map: Record<string, [string, string]> = { suspend: ["suspended", "suspended"], archive: ["archived", "archived"], restore: ["active", "active"] };
  const m = map[op];
  if (!m) return;
  await sql`UPDATE users SET status = ${m[0]} WHERE id = ${id}`;
  await sql`UPDATE staff_profiles SET employment_status = ${m[1]} WHERE user_id = ${id}`;
  if (m[0] !== "active") await sql`DELETE FROM sessions WHERE user_id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `staff.${op}`, entity: "user", entityId: id });
  revalidatePath(`/portal/staff/${id}`);
}
