"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { newAccessCode } from "@/lib/student-codes";
import { makeRegCodes } from "@/lib/reg-codes";
import { teacherClassIds, wideScope } from "@/lib/scope";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dateOr = (v: unknown) => { const t = clean(v, 10); return ISO.test(t) && !Number.isNaN(new Date(t).getTime()) ? t : null; };
const today = () => new Date(Date.now() + 3600_000).toISOString().slice(0, 10);

/** Simple generator: how many codes, for students or parents, with an optional last day and batch label. Each code works once. */
export async function makeCodes(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("access_codes:manage");
  const kind = clean(fd.get("kind"), 8) === "parent" ? "parent" : "student";
  const count = Math.round(Number(fd.get("count")));
  const from = dateOr(fd.get("validFrom")), to = dateOr(fd.get("expiresOn")), batch = clean(fd.get("batch"), 40) || null;
  if (!Number.isFinite(count) || count < 1 || count > 300) return { error: "Enter how many codes (1 to 300)." };
  if (fd.get("expiresOn") && !to) return { error: "The last valid day is not a valid date." };
  if (to && to < today()) return { error: "The last valid day is already in the past." };
  if (from && to && to < from) return { error: "The last day must be on or after the start day." };
  const made = await makeRegCodes({ schoolId: me.schoolId, kind, count, batch, from, to, by: me.id });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "access_code.generate", entity: "access_code", meta: { kind, made, batch, from, to } });
  revalidatePath("/portal/access-codes");
  return { ok: `${made} ${kind} code${made === 1 ? "" : "s"} generated. Each works once. Print them below.` };
}

export async function codeOp(fd: FormData): Promise<void> {
  const me = await requirePerm("access_codes:manage");
  const id = clean(fd.get("id"), 40), op = clean(fd.get("op"), 10);
  if (!UUID.test(id)) return;
  if (op === "revoke") await sql`UPDATE access_codes SET status = 'revoked' WHERE id = ${id} AND school_id = ${me.schoolId} AND used_at IS NULL`;
  else if (op === "restore") await sql`UPDATE access_codes SET status = 'active' WHERE id = ${id} AND school_id = ${me.schoolId}`;
  else if (op === "delete") await sql`DELETE FROM access_codes WHERE id = ${id} AND school_id = ${me.schoolId} AND used_at IS NULL`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `access_code.${op}`, entity: "access_code", entityId: id });
  revalidatePath("/portal/access-codes");
}

/** Approves or rejects students and parents who registered with a code. They cannot sign in until approved. */
export async function decideRegistration(fd: FormData): Promise<void> {
  const me = await requirePerm("access_codes:manage");
  const op = clean(fd.get("op"), 16);
  const ids = op.endsWith("all") ? (await sql`SELECT id FROM users WHERE school_id = ${me.schoolId} AND status = 'pending' AND role IN ('student','parent')`).map((r) => r.id as string) : [clean(fd.get("id"), 40)];
  for (const id of ids) {
    if (!UUID.test(id)) continue;
    const [u] = await sql`SELECT id, role FROM users WHERE id = ${id} AND school_id = ${me.schoolId} AND status = 'pending' AND role IN ('student','parent')`;
    if (!u) continue;
    if (op.startsWith("approve")) {
      await sql`UPDATE users SET status = 'active' WHERE id = ${id}`;
      if (u.role === "student") await sql`UPDATE students SET status = 'active' WHERE user_id = ${id} AND status = 'enrolled'`;
      await sql`INSERT INTO notifications (user_id, title, body, link) VALUES (${id}, 'Your account is active', 'Welcome! You can now use the portal.', '/portal')`;
    } else if (op === "reject") {
      await sql`UPDATE access_codes SET used_by = NULL WHERE used_by = ${id}`;
      await sql`DELETE FROM students WHERE user_id = ${id}`;
      await sql`DELETE FROM parent_profiles WHERE user_id = ${id}`;
      await sql`DELETE FROM users WHERE id = ${id}`;
    }
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `registration.${op.replace("-all", "")}`, entity: "user", entityId: id });
  }
  revalidatePath("/portal/access-codes");
}

export async function codeRow(fd: FormData): Promise<void> {
  const me = await requirePerm("access_codes:manage");
  const id = clean(fd.get("id"), 40), op = clean(fd.get("op"), 12);
  if (!UUID.test(id)) return;
  const [s] = await sql`SELECT id, user_id, class_id FROM students WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!s) return;
  const scope = wideScope(me) ? null : await teacherClassIds(me.id);
  if (scope && !(s.class_id && scope.includes(s.class_id))) return;
  if (op === "generate" || op === "regenerate") {
    const c = await newAccessCode();
    await sql`UPDATE students SET code_hash = ${c.hash}, code_enc = ${c.enc}, code_status = 'active' WHERE id = ${id}`;
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `access_code.${op}`, entity: "student", entityId: id });
  } else if (op === "revoke") {
    await sql`UPDATE students SET code_status = 'revoked' WHERE id = ${id}`;
    if (s.user_id) { await sql`UPDATE users SET status = 'suspended' WHERE id = ${s.user_id}`; await sql`DELETE FROM sessions WHERE user_id = ${s.user_id}`; }
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "access_code.revoke", entity: "student", entityId: id });
  } else if (op === "restore") {
    await sql`UPDATE students SET code_status = 'active' WHERE id = ${id}`;
    if (s.user_id) await sql`UPDATE users SET status = 'active' WHERE id = ${s.user_id}`;
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "access_code.restore", entity: "student", entityId: id });
  }
  revalidatePath("/portal/access-codes");
}
