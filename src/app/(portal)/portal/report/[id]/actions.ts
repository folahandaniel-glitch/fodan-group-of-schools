"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { canSeeStudent } from "@/lib/scope";

type State = { error?: string; ok?: string };

export async function saveRemarks(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  const student = clean(fd.get("student"), 40), term = clean(fd.get("term"), 40);
  if (!/^[0-9a-f-]{36}$/i.test(student) || !/^[0-9a-f-]{36}$/i.test(term)) return { error: "Invalid request." };
  if (!(await canSeeStudent(me, student))) return { error: "Not permitted." };
  const full = can(me, "reports:approve");
  if (!full && !can(me, "reports:edit")) return { error: "Not permitted." };
  const [old] = await sql`SELECT * FROM report_remarks WHERE student_id = ${student} AND term_id = ${term}`;
  const pick = (k: string, col: string, allowed: boolean) => (allowed ? clean(fd.get(k), 600) || null : old?.[col] ?? null);
  await sql`INSERT INTO report_remarks (student_id, term_id, class_teacher, hod, principal, conduct)
            VALUES (${student}, ${term}, ${pick("classTeacher", "class_teacher", true)}, ${pick("hod", "hod", full || me.roles.includes("hod"))},
                    ${pick("principal", "principal", full)}, ${pick("conduct", "conduct", true)})
            ON CONFLICT (student_id, term_id) DO UPDATE SET class_teacher = EXCLUDED.class_teacher, hod = EXCLUDED.hod, principal = EXCLUDED.principal, conduct = EXCLUDED.conduct`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "report.remarks", entity: "student", entityId: student });
  revalidatePath(`/portal/report/${student}`);
  return { ok: "Remarks saved." };
}
