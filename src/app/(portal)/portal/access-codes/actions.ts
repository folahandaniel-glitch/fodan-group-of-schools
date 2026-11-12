"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { newAccessCode } from "@/lib/student-codes";
import { teacherClassIds, wideScope } from "@/lib/scope";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;

/** Issues codes in bulk. "missing" gives a code to every student without one; "class" replaces the codes of one class (old codes stop working). */
export async function bulkCodes(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("access_codes:manage");
  const mode = clean(fd.get("mode"), 10), cls = clean(fd.get("class"), 40);
  if (!["missing", "class"].includes(mode)) return { error: "Choose what to do." };
  if (mode === "class" && !UUID.test(cls)) return { error: "Choose a class." };
  if (mode === "class" && fd.get("confirm") !== "on") return { error: "Tick the box to confirm. The old codes of that class will stop working." };
  const scope = wideScope(me) ? null : await teacherClassIds(me.id);
  const rows = await sql`SELECT id FROM students WHERE school_id = ${me.schoolId} AND status IN ('active','enrolled')
    ${mode === "missing" ? sql`AND code_enc IS NULL` : sql`AND class_id = ${cls}`} ${scope ? sql`AND class_id = ANY(${scope})` : sql``} LIMIT 600`;
  if (rows.length === 0) return { ok: mode === "missing" ? "Every student already has a code." : "That class has no active students." };
  for (const r of rows) {
    const c = await newAccessCode();
    await sql`UPDATE students SET code_hash = ${c.hash}, code_enc = ${c.enc}, code_status = 'active' WHERE id = ${r.id}`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: mode === "missing" ? "access_code.bulk_generate" : "access_code.bulk_regenerate", entity: "student", meta: { count: rows.length, class: mode === "class" ? cls : null } });
  revalidatePath("/portal/access-codes");
  return { ok: `${rows.length} code${rows.length === 1 ? "" : "s"} issued.` };
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
