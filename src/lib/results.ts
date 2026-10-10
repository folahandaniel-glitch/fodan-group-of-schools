import { sql } from "./db";
import { getSetting } from "./settings";
import { commentFor, gradeFor, normalise, totalScore, type GradeBand, type Weights, DEFAULT_WEIGHTS } from "./logic/scoring";

/**
 * Recomputes one student's subject result for a term from their best attempts.
 * Every assignment / CA / exam of the subject counts once it is attempted, closed or past its
 * deadline; an assessment the student skipped contributes zero (totals cannot be inflated by skipping work).
 */
export async function recomputeResult(studentId: string, termId: string, subjectId: string): Promise<void> {
  const [st] = await sql`SELECT school_id, class_id FROM students WHERE id = ${studentId}`;
  if (!st) return;
  const weights = (await getSetting<Weights>("weights")) ?? DEFAULT_WEIGHTS;
  const bands = await getSetting<GradeBand[]>("grading");
  const comments = await getSetting<Record<string, string>>("comments");
  const policy = await getSetting<{ release: string }>("results");

  const rows = await sql`
    SELECT a.kind, a.id, a.status, a.due_at,
      COALESCE((SELECT max(CASE WHEN t.max_score > 0 THEN t.score / t.max_score ELSE 0 END)
                FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${studentId} AND t.status = 'submitted'), 0) AS pct,
      EXISTS (SELECT 1 FROM attempts t WHERE t.assessment_id = a.id AND t.student_id = ${studentId} AND t.status = 'submitted') AS attempted
    FROM assessments a
    WHERE a.school_id = ${st.school_id} AND a.term_id = ${termId} AND a.subject_id = ${subjectId}
      AND a.class_id = ${st.class_id} AND a.status IN ('published','closed') AND a.kind IN ('assignment','ca','exam')`;

  const now = Date.now();
  const part = (kind: string, weight: number): number | null => {
    // Work that is still open for the student does not count against them yet.
    const list = rows.filter((r) => r.kind === kind && (r.attempted || r.status === "closed" || (r.due_at && new Date(r.due_at).getTime() < now)));
    if (list.length === 0) return null;
    const avg = list.reduce((s, r) => s + Number(r.pct), 0) / list.length;
    return normalise(avg, 1, weight);
  };
  const assignment = part("assignment", weights.assignment);
  const ca = part("ca", weights.ca);
  const exam = part("exam", weights.exam);
  if (assignment === null && ca === null && exam === null) return;
  const total = totalScore({ assignment, ca, exam });
  const band = gradeFor(total, bands);
  const remark = commentFor(band.grade, comments);
  const autoRelease = policy?.release === "immediate";
  await sql`
    INSERT INTO results (school_id, student_id, term_id, subject_id, class_id, assignment, ca, exam, total, grade, remark, released)
    VALUES (${st.school_id}, ${studentId}, ${termId}, ${subjectId}, ${st.class_id}, ${assignment}, ${ca}, ${exam}, ${total}, ${band.grade}, ${remark}, ${autoRelease})
    ON CONFLICT (student_id, term_id, subject_id) DO UPDATE SET
      class_id = EXCLUDED.class_id, assignment = EXCLUDED.assignment, ca = EXCLUDED.ca, exam = EXCLUDED.exam,
      total = EXCLUDED.total, grade = EXCLUDED.grade, remark = EXCLUDED.remark, updated_at = now()`;
}

export async function recomputeForAssessment(assessmentId: string): Promise<void> {
  const [a] = await sql`SELECT term_id, subject_id, class_id, kind FROM assessments WHERE id = ${assessmentId}`;
  if (!a || !a.term_id || !a.subject_id || !["assignment", "ca", "exam"].includes(a.kind)) return;
  const kids = await sql`SELECT id FROM students WHERE class_id = ${a.class_id} AND status IN ('active','enrolled')`;
  for (const k of kids) await recomputeResult(k.id, a.term_id, a.subject_id);
}
