import { sql } from "./db";
import { levelName } from "./curriculum";
import { periodQuestions } from "./logic/qgen";

export type Work = "classwork" | "assignment";
const KIND: Record<Work, string> = { classwork: "classwork", assignment: "practice" };
export const WORK_LABEL: Record<Work, string> = { classwork: "Classwork", assignment: "Assignment" };

/**
 * Makes sure the auto-marked work for one lesson period exists for the student's class, and returns its assessment id.
 * Five medium questions, 10 minutes, marked by the computer. Questions typed into the question bank for this topic are used first.
 */
export async function ensurePeriodWork(student: { school_id: string; class_id: string }, topicId: string, day: number, work: Work): Promise<string | null> {
  const [t] = await sql`SELECT id, level, subject, topic FROM curriculum_topics WHERE id = ${topicId} AND school_id = ${student.school_id}`;
  if (!t || day < 1 || day > 3) return null;
  const kind = KIND[work];
  const [have] = await sql`SELECT id FROM assessments WHERE topic_id = ${topicId} AND day = ${day} AND kind = ${kind} AND class_id = ${student.class_id}`;
  if (have) return have.id as string;
  let [sub] = await sql`SELECT id FROM subjects WHERE school_id = ${student.school_id} AND lower(name) = lower(${t.subject as string})`;
  if (!sub) [sub] = await sql`INSERT INTO subjects (school_id, name) VALUES (${student.school_id}, ${t.subject as string}) ON CONFLICT (school_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
  const title = `${t.subject} · ${t.topic} · Day ${day} ${WORK_LABEL[work]}`;
  const [a] = await sql`INSERT INTO assessments (school_id, kind, title, subject_id, class_id, topic, topic_id, day, duration_min, attempt_limit, randomize, status, release_mode, released)
    VALUES (${student.school_id}, ${kind}, ${title}, ${sub.id}, ${student.class_id}, ${t.topic as string}, ${topicId}, ${day}, 10, 3, true, 'published', 'immediate', true)
    ON CONFLICT (topic_id, day, kind, class_id) WHERE topic_id IS NOT NULL DO NOTHING RETURNING id`;
  if (!a) { const [again] = await sql`SELECT id FROM assessments WHERE topic_id = ${topicId} AND day = ${day} AND kind = ${kind} AND class_id = ${student.class_id}`; return (again?.id as string) ?? null; }

  // Teacher questions for this topic come first.
  const own = await sql`SELECT id FROM questions WHERE school_id = ${student.school_id} AND status = 'APPROVED' AND difficulty = 'medium' AND topic ILIKE ${"%" + (t.topic as string).replace(/[%_\\]/g, "") + "%"}
    AND (subject_id = ${sub.id} OR subject_id IS NULL) ORDER BY md5(id::text || ${`${day}${kind}`}) LIMIT 5`;
  const ids = own.map((r) => r.id as string);
  if (ids.length < 5) {
    const gen = periodQuestions({ subject: t.subject as string, level: t.level as number, topic: t.topic as string, day, kind, topicId });
    for (const q of gen.slice(0, 5 - ids.length)) {
      const keys = ["a", "b", "c", "d"];
      const options = q.options.map((text, i) => ({ key: keys[i], text }));
      const [row] = await sql`INSERT INTO questions (school_id, subject_id, class_id, topic, text, options, correct, explanation, difficulty, marks, source, status)
        VALUES (${student.school_id}, ${sub.id}, ${student.class_id}, ${t.topic as string}, ${q.text}, ${sql.json(options as never)}, ${keys[q.answer]}, ${q.explanation}, 'medium', 1, ${`auto:${levelName(t.level as number)}`}, 'APPROVED') RETURNING id`;
      ids.push(row.id as string);
    }
  }
  for (const qid of ids) await sql`INSERT INTO assessment_questions (assessment_id, question_id, marks) VALUES (${a.id}, ${qid}, 1) ON CONFLICT DO NOTHING`;
  return a.id as string;
}
