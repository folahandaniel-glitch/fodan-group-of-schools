"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { currentTerm } from "@/lib/settings";
import { needsDepartment, nextLevel } from "@/lib/logic/academics";

type State = { error?: string; ok?: string };

/** Pick the destination class for a level, keeping arm / department where possible. */
async function destination(q: typeof sql, schoolId: string, from: { level: number; arm: string; department_id: string | null }, level: number) {
  const cands = await q`SELECT id, arm, department_id FROM classes WHERE school_id = ${schoolId} AND level = ${level} AND NOT archived ORDER BY arm`;
  if (cands.length === 0) return null;
  const keepDept = needsDepartment(level) && from.department_id;
  const exact = cands.find((c) => c.arm === from.arm && (!keepDept || c.department_id === from.department_id));
  const sameDept = keepDept ? cands.find((c) => c.department_id === from.department_id) : null;
  return (exact ?? sameDept ?? cands[0]) as { id: string; department_id: string | null };
}

export async function runPromotion(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("promotion:create");
  const action = clean(fd.get("action"), 20);
  const ids = fd.getAll("student").map((v) => clean(v, 40)).filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  const remarks = clean(fd.get("remarks"), 300) || null;
  const targetClass = clean(fd.get("targetClass"), 40);
  if (ids.length === 0) return { error: "Select at least one student." };
  if (!["promote", "retain", "repeat", "transfer", "graduate", "withdraw"].includes(action)) return { error: "Choose an action." };
  if (action === "transfer" && !/^[0-9a-f-]{36}$/i.test(targetClass)) return { error: "Choose the class to transfer to." };
  const term = await currentTerm();
  const students = await sql`SELECT s.id, s.user_id, s.class_id, s.department_id, c.level, c.arm
                             FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ANY(${ids}) AND s.school_id = ${me.schoolId}`;
  let done = 0;
  const skipped: string[] = [];
  await sql.begin(async (tx) => {
    for (const s of students) {
      let toClass: string | null = s.class_id, toDept: string | null = s.department_id, newStatus: string | null = null;
      if (action === "promote") {
        const lvl = nextLevel(s.level);
        if (lvl === null) { newStatus = "graduated"; toClass = s.class_id; }
        else {
          const d = await destination(tx as unknown as typeof sql, me.schoolId, { level: s.level, arm: s.arm, department_id: s.department_id }, lvl);
          if (!d) { skipped.push(s.id); continue; }
          toClass = d.id; toDept = d.department_id ?? s.department_id;
        }
      } else if (action === "transfer") {
        const [c] = await tx`SELECT id, department_id FROM classes WHERE id = ${targetClass} AND school_id = ${me.schoolId} AND NOT archived`;
        if (!c) { skipped.push(s.id); continue; }
        toClass = c.id; toDept = c.department_id ?? s.department_id;
      } else if (action === "graduate") newStatus = "graduated";
      else if (action === "withdraw") newStatus = "withdrawn";
      // retain / repeat keep the class and only write history.
      const histAction = newStatus ?? action;
      await tx`INSERT INTO student_history (school_id, student_id, action, from_class_id, to_class_id, from_department_id, to_department_id, session_id, term_id, by_user, remarks)
               VALUES (${me.schoolId}, ${s.id}, ${histAction}, ${s.class_id}, ${toClass}, ${s.department_id}, ${toDept}, ${term?.session_id ?? null}, ${term?.id ?? null}, ${me.id}, ${remarks})`;
      await tx`UPDATE students SET class_id = ${toClass}, department_id = ${toDept}, status = COALESCE(${newStatus}, status) WHERE id = ${s.id}`;
      if (newStatus && s.user_id) {
        await tx`UPDATE users SET status = 'suspended' WHERE id = ${s.user_id}`;
        await tx`DELETE FROM sessions WHERE user_id = ${s.user_id}`;
      }
      done++;
    }
  });
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `student.${action}`, entity: "students", meta: { count: done, skipped: skipped.length } });
  revalidatePath("/portal/promotion");
  return { ok: `${done} student${done === 1 ? "" : "s"} processed.${skipped.length ? ` ${skipped.length} skipped (no destination class exists).` : ""} Access codes are unchanged.` };
}
