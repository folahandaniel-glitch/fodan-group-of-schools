"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { newAccessCode } from "@/lib/student-codes";
import { teacherClassIds, wideScope } from "@/lib/scope";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dateOr = (v: unknown) => { const t = clean(v, 10); return ISO.test(t) && !Number.isNaN(new Date(t).getTime()) ? t : null; };
const today = () => new Date(Date.now() + 3600_000).toISOString().slice(0, 10);

/**
 * Generates access codes for a group of students, with a validity window and an optional batch number.
 * who: missing (no code yet) | expired (code past its end date) | class (one class) | all (whole school).
 * For class/all, students who already have a code keep it unless "replace" is ticked.
 */
export async function generateCodes(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("access_codes:manage");
  const who = clean(fd.get("who"), 10), cls = clean(fd.get("class"), 40), replace = fd.get("replace") === "on";
  const from = dateOr(fd.get("validFrom")), to = dateOr(fd.get("expiresOn")), batch = clean(fd.get("batch"), 40) || null, note = clean(fd.get("note"), 160) || null;
  if (!["missing", "expired", "class", "all"].includes(who)) return { error: "Choose who the codes are for." };
  if (who === "class" && !UUID.test(cls)) return { error: "Choose a class." };
  if (fd.get("validFrom") && !from) return { error: "The start date is not valid." };
  if (fd.get("expiresOn") && !to) return { error: "The end date is not valid." };
  if (to && to < today()) return { error: "The end date is already in the past." };
  if (from && to && to < from) return { error: "The end date must be on or after the start date." };
  if ((replace && (who === "class" || who === "all")) && fd.get("confirm") !== "on") return { error: "Tick the confirmation box. Replacing makes the old codes stop working." };
  const scope = wideScope(me) ? null : await teacherClassIds(me.id);
  const rows = await sql`SELECT id FROM students WHERE school_id = ${me.schoolId} AND status IN ('active','enrolled') AND user_id IS NULL
    ${who === "missing" ? sql`AND code_enc IS NULL` : who === "expired" ? sql`AND code_expires_on < ${today()}` : who === "class" ? sql`AND class_id = ${cls}${replace ? sql`` : sql` AND code_enc IS NULL`}` : replace ? sql`` : sql`AND code_enc IS NULL`}
    ${scope ? sql`AND class_id = ANY(${scope})` : sql``} ORDER BY last_name LIMIT 1500`;
  if (rows.length === 0) return { ok: "No students needed a code for that choice. (Students who have already activated their account are skipped.)" };
  for (const r of rows) {
    const c = await newAccessCode();
    await sql`UPDATE students SET code_hash = ${c.hash}, code_enc = ${c.enc}, code_status = 'active', code_batch = ${batch}, code_valid_from = ${from}, code_expires_on = ${to},
      code_issued_at = now(), code_issued_by = ${me.id}, code_note = ${note} WHERE id = ${r.id}`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "access_code.generate_batch", entity: "student", meta: { who, count: rows.length, batch, from, to, replace } });
  revalidatePath("/portal/access-codes");
  return { ok: `${rows.length} code${rows.length === 1 ? "" : "s"} generated${batch ? ` in batch ${batch}` : ""}. Use "Print code slips" to hand them out.` };
}

/** Changes the validity dates (and optionally the batch label) of codes already issued, for a batch or a class. */
export async function updateValidity(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("access_codes:manage");
  const batch = clean(fd.get("batch"), 40), cls = clean(fd.get("class"), 40);
  const from = dateOr(fd.get("validFrom")), to = dateOr(fd.get("expiresOn"));
  if (!batch && !UUID.test(cls)) return { error: "Enter a batch number or choose a class." };
  if (!from && !to) return { error: "Enter a new start or end date." };
  if (from && to && to < from) return { error: "The end date must be on or after the start date." };
  const scope = wideScope(me) ? null : await teacherClassIds(me.id);
  const rows = await sql`UPDATE students SET code_valid_from = COALESCE(${from}::date, code_valid_from), code_expires_on = COALESCE(${to}::date, code_expires_on)
    WHERE school_id = ${me.schoolId} AND code_enc IS NOT NULL ${batch ? sql`AND code_batch = ${batch}` : sql`AND class_id = ${cls}`} ${scope ? sql`AND class_id = ANY(${scope})` : sql``} RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "access_code.validity", entity: "student", meta: { batch, class: cls || null, count: rows.length, from, to } });
  revalidatePath("/portal/access-codes");
  return rows.length ? { ok: `Updated ${rows.length} code${rows.length === 1 ? "" : "s"}.` } : { error: "No codes matched that batch or class." };
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
