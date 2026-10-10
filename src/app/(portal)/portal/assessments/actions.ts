"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { can, requirePerm, type Me } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { currentTerm } from "@/lib/settings";
import { teacherClassIds, wideScope } from "@/lib/scope";
import { recomputeForAssessment } from "@/lib/results";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };
const KINDS = ["assignment", "ca", "exam", "mock"];

async function mayRun(me: Me, classId: string | null): Promise<boolean> {
  if (wideScope(me) || can(me, "assessments:manage")) return true;
  if (!classId) return false;
  return (await teacherClassIds(me.id)).includes(classId);
}

async function mayEdit(me: Me, id: string) {
  const [a] = await sql`SELECT * FROM assessments WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!a) return null;
  if (a.created_by !== me.id && !wideScope(me) && !can(me, "assessments:manage")) return null;
  return a;
}

export async function createAssessment(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("assessments:create");
  const kind = clean(fd.get("kind"), 12);
  const title = clean(fd.get("title"), 160);
  if (!KINDS.includes(kind)) return { error: "Choose the assessment type." };
  if (!title) return { error: "Enter a title." };
  const classId = uuid(fd.get("classId"));
  if (kind !== "mock" && !classId) return { error: "Choose the class." };
  if (!(await mayRun(me, classId))) return { error: "You can only create assessments for classes you teach." };
  const term = await currentTerm();
  const [a] = await sql`INSERT INTO assessments (school_id, kind, title, subject_id, class_id, term_id, topic, instructions, start_at, due_at, duration_min, attempt_limit,
      pass_mark, draw_count, randomize, release_mode, mock_category, mock_type, created_by)
    VALUES (${me.schoolId}, ${kind}, ${title}, ${uuid(fd.get("subjectId"))}, ${classId}, ${uuid(fd.get("termId")) ?? term?.id ?? null}, ${clean(fd.get("topic"), 160) || null},
      ${clean(fd.get("instructions"), 2000) || null}, ${clean(fd.get("startAt"), 30) || null}, ${clean(fd.get("dueAt"), 30) || null},
      ${Math.min(Math.max(Number(fd.get("duration")) || 30, 1), 300)}, ${Math.min(Math.max(Number(fd.get("attempts")) || (kind === "mock" ? 5 : 1), 1), 50)},
      ${Math.min(Math.max(Number(fd.get("passMark")) || 40, 0), 100)}, ${Number(fd.get("drawCount")) > 0 ? Number(fd.get("drawCount")) : null}, ${fd.get("randomize") !== "off"},
      ${kind === "mock" ? "immediate" : "manual"}, ${clean(fd.get("mockCategory"), 30) || null}, ${clean(fd.get("mockType"), 40) || null}, ${me.id}) RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "exam.create", entity: "assessment", entityId: a.id, meta: { kind } });
  redirect(`/portal/assessments/${a.id}`);
}

export async function addPoolQuestions(fd: FormData): Promise<void> {
  const me = await requirePerm("assessments:edit");
  const id = uuid(fd.get("id"));
  const ids = fd.getAll("q").map(uuid).filter(Boolean) as string[];
  if (!id || ids.length === 0) return;
  const a = await mayEdit(me, id);
  if (!a || a.status === "closed") return;
  await sql`INSERT INTO assessment_questions (assessment_id, question_id, marks)
            SELECT ${id}, q.id, q.marks FROM questions q WHERE q.id = ANY(${ids}) AND q.school_id = ${me.schoolId} AND q.status = 'APPROVED'
            ON CONFLICT DO NOTHING`;
  await sql`UPDATE assessments SET version = version + 1 WHERE id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "exam.questions.add", entity: "assessment", entityId: id, meta: { count: ids.length } });
  revalidatePath(`/portal/assessments/${id}`);
}

export async function removePoolQuestion(fd: FormData): Promise<void> {
  const me = await requirePerm("assessments:edit");
  const id = uuid(fd.get("id")), q = uuid(fd.get("q"));
  if (!id || !q) return;
  const a = await mayEdit(me, id);
  if (!a || a.status === "closed") return;
  await sql`DELETE FROM assessment_questions WHERE assessment_id = ${id} AND question_id = ${q}`;
  await sql`UPDATE assessments SET version = version + 1 WHERE id = ${id}`;
  revalidatePath(`/portal/assessments/${id}`);
}

export async function setAssessmentStatus(fd: FormData): Promise<void> {
  const me = await requirePerm("assessments:edit");
  const id = uuid(fd.get("id"));
  const op = clean(fd.get("op"), 12);
  if (!id) return;
  const a = await mayEdit(me, id);
  if (!a) return;
  if (op === "publish") {
    if (!can(me, "assessments:publish")) return;
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM assessment_questions aq JOIN questions q ON q.id = aq.question_id WHERE aq.assessment_id = ${id} AND q.status = 'APPROVED'`;
    if (n === 0) return;
    await sql`UPDATE assessments SET status = 'published' WHERE id = ${id}`;
    await audit({ schoolId: me.schoolId, actorId: me.id, action: "exam.publish", entity: "assessment", entityId: id });
    if (a.class_id) {
      await sql`INSERT INTO notifications (user_id, title, body, link)
                SELECT s.user_id, ${`New ${a.kind === "ca" ? "CA test" : a.kind}: ${a.title}`}, ${a.due_at ? "Due " + new Date(a.due_at).toLocaleDateString("en-GB") : null}, '/portal/work'
                FROM students s WHERE s.class_id = ${a.class_id} AND s.user_id IS NOT NULL AND s.status = 'active'`;
    }
  } else if (op === "close") {
    await sql`UPDATE assessments SET status = 'closed' WHERE id = ${id}`;
    await recomputeForAssessment(id);
    await audit({ schoolId: me.schoolId, actorId: me.id, action: "exam.close", entity: "assessment", entityId: id });
  } else if (op === "reopen") {
    await sql`UPDATE assessments SET status = 'draft' WHERE id = ${id}`;
  }
  revalidatePath(`/portal/assessments/${id}`);
}

/** Releases results of the assessment's subject/term to students and parents. */
export async function releaseResults(fd: FormData): Promise<void> {
  const me = await requirePerm("results:publish");
  const id = uuid(fd.get("id"));
  if (!id) return;
  const a = await mayEdit(me, id);
  if (!a || !a.term_id || !a.subject_id) return;
  await recomputeForAssessment(id);
  await sql`UPDATE results SET released = true WHERE school_id = ${me.schoolId} AND term_id = ${a.term_id} AND subject_id = ${a.subject_id} AND class_id = ${a.class_id}`;
  await sql`UPDATE assessments SET released = true WHERE id = ${id}`;
  await sql`INSERT INTO notifications (user_id, title, link)
            SELECT s.user_id, 'Your results have been released', '/portal/results' FROM students s WHERE s.class_id = ${a.class_id} AND s.user_id IS NOT NULL
            UNION SELECT l.parent_id, 'New results are available for your child', '/portal/results'
            FROM parent_links l JOIN students s ON s.id = l.student_id WHERE s.class_id = ${a.class_id} AND l.status = 'active'`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "result.release", entity: "assessment", entityId: id });
  revalidatePath(`/portal/assessments/${id}`);
}
