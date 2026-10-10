"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { getSetting } from "@/lib/settings";
import { commentFor, gradeFor, totalScore, DEFAULT_WEIGHTS, type GradeBand, type Weights } from "@/lib/logic/scoring";
import { recomputeResult } from "@/lib/results";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };

export async function saveMarkSheet(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("results:edit");
  const classId = uuid(fd.get("classId")), subjectId = uuid(fd.get("subjectId")), termId = uuid(fd.get("termId"));
  if (!classId || !subjectId || !termId) return { error: "Missing class, subject or term." };
  if (!wideScope(me) && !(await teacherClassIds(me.id)).includes(classId)) return { error: "You do not teach this class." };
  const w = (await getSetting<Weights>("weights")) ?? DEFAULT_WEIGHTS;
  const bands = await getSetting<GradeBand[]>("grading");
  const comments = await getSetting<Record<string, string>>("comments");
  const ids = fd.getAll("sid").map(uuid).filter(Boolean) as string[];
  const num = (v: FormDataEntryValue | null, max: number) => {
    const s = String(v ?? "").trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : null;
  };
  let changed = 0;
  for (const sid of ids) {
    const [st] = await sql`SELECT school_id FROM students WHERE id = ${sid} AND class_id = ${classId} AND school_id = ${me.schoolId}`;
    if (!st) continue;
    const a = num(fd.get(`a_${sid}`), w.assignment), c = num(fd.get(`c_${sid}`), w.ca), e = num(fd.get(`e_${sid}`), w.exam);
    const remark = clean(fd.get(`r_${sid}`), 300) || null;
    const [old] = await sql`SELECT assignment, ca, exam, teacher_remark FROM results WHERE student_id = ${sid} AND term_id = ${termId} AND subject_id = ${subjectId}`;
    // Teachers of the class may enter paper marks; every change to an existing score is audited below.
    const useA = a, useC = c, useE = e;
    if (useA === null && useC === null && useE === null && !remark) continue;
    const total = totalScore({ assignment: useA, ca: useC, exam: useE });
    const band = gradeFor(total, bands);
    await sql`INSERT INTO results (school_id, student_id, term_id, subject_id, class_id, assignment, ca, exam, total, grade, remark, teacher_remark)
              VALUES (${me.schoolId}, ${sid}, ${termId}, ${subjectId}, ${classId}, ${useA}, ${useC}, ${useE}, ${total}, ${band.grade}, ${commentFor(band.grade, comments)}, ${remark})
              ON CONFLICT (student_id, term_id, subject_id) DO UPDATE SET assignment = EXCLUDED.assignment, ca = EXCLUDED.ca, exam = EXCLUDED.exam,
                total = EXCLUDED.total, grade = EXCLUDED.grade, remark = EXCLUDED.remark, teacher_remark = EXCLUDED.teacher_remark, updated_at = now()`;
    if (old && (Number(old.assignment) !== (useA ?? 0) || Number(old.ca) !== (useC ?? 0) || Number(old.exam) !== (useE ?? 0))) {
      await audit({ schoolId: me.schoolId, actorId: me.id, action: "result.edit", entity: "student", entityId: sid, meta: { subjectId, termId, before: old, after: { a: useA, c: useC, e: useE } } });
    }
    changed++;
  }
  revalidatePath("/portal/mark-sheet");
  return { ok: `${changed} result${changed === 1 ? "" : "s"} saved.` };
}

export async function recomputeAll(fd: FormData): Promise<void> {
  const me = await requirePerm("results:edit");
  const classId = uuid(fd.get("classId")), subjectId = uuid(fd.get("subjectId")), termId = uuid(fd.get("termId"));
  if (!classId || !subjectId || !termId) return;
  if (!wideScope(me) && !(await teacherClassIds(me.id)).includes(classId)) return;
  const kids = await sql`SELECT id FROM students WHERE class_id = ${classId} AND school_id = ${me.schoolId} AND status IN ('active','enrolled')`;
  for (const k of kids) await recomputeResult(k.id, termId, subjectId);
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "result.recompute", entity: "class", entityId: classId, meta: { subjectId, termId } });
  revalidatePath("/portal/mark-sheet");
}

export async function releaseSheet(fd: FormData): Promise<void> {
  const me = await requirePerm("results:publish");
  const classId = uuid(fd.get("classId")), subjectId = uuid(fd.get("subjectId")), termId = uuid(fd.get("termId"));
  if (!classId || !termId) return;
  const hold = fd.get("hold") === "1";
  await sql`UPDATE results SET released = ${!hold} WHERE school_id = ${me.schoolId} AND class_id = ${classId} AND term_id = ${termId} ${subjectId ? sql`AND subject_id = ${subjectId}` : sql``}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: hold ? "result.hold" : "result.release", entity: "class", entityId: classId, meta: { subjectId, termId } });
  revalidatePath("/portal/mark-sheet");
}
