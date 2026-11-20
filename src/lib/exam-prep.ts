import { sql } from "./db";
import { periodQuestions } from "./logic/qgen";
import { hashSeed } from "./logic/qgen";

/** Exam-preparation courses. Every subject gets a CA test, a terminal examination and a full practice paper. */
export type PrepCourse = { cat: string; label: string; subjects: { name: string; as: string }[] };
const S = (name: string, as = name) => ({ name, as });
const SSS = ["English Language", "Mathematics", "Biology", "Chemistry", "Physics", "Economics", "Government", "Literature in English", "Geography", "Commerce", "Financial Accounting", "Agricultural Science", "Civic Education", "Christian Religious Studies", "Further Mathematics", "Computer Studies", "Food and Nutrition"];
export const PREP: PrepCourse[] = [
  { cat: "common_entrance", label: "Common Entrance", subjects: [S("English Studies"), S("Mathematics"), S("General Paper", "Social And Citizenship Studies"), S("Basic Science", "Basic Science And Technology")] },
  { cat: "bece", label: "BECE", subjects: ["English Studies", "Mathematics", "Intermediate Science", "Social And Citizenship Studies", "Digital Technologies", "Business Studies", "Christian Religious Studies", "Cultural And Creative Arts", "Physical And Health Education", "Nigerian History", "French"].map((n) => S(n)) },
  { cat: "waec", label: "WAEC (WASSCE)", subjects: SSS.map((n) => S(n)) },
  { cat: "neco", label: "NECO (SSCE)", subjects: SSS.map((n) => S(n)) },
  { cat: "jamb", label: "JAMB (UTME)", subjects: [S("Use of English", "English Language"), ...["Mathematics", "Biology", "Chemistry", "Physics", "Economics", "Government", "Literature in English", "Geography", "Commerce", "Accounting", "Christian Religious Studies", "Agricultural Science"].map((n) => S(n))] },
  { cat: "ijmb", label: "IJMB (A-Level)", subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature in English", "Geography", "English Language"].map((n) => S(n)) },
  { cat: "jupeb", label: "JUPEB", subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Government", "Literature in English", "Geography", "English Language"].map((n) => S(n)) },
  { cat: "toefl", label: "TOEFL", subjects: [S("Reading and Vocabulary", "English Language"), S("Structure and Written Expression", "English Language"), S("Listening Comprehension (text-based)", "English Language"), S("Academic Writing Skills", "English Language")] },
  { cat: "ielts", label: "IELTS", subjects: [S("Reading", "English Language"), S("Vocabulary and Word Use", "English Language"), S("Grammar and Writing Skills", "English Language"), S("Listening Comprehension (text-based)", "English Language")] },
  { cat: "sat", label: "SAT", subjects: [S("Reading and Writing", "English Language"), S("Math: Algebra and Data", "Mathematics"), S("Math: Advanced Math", "Further Mathematics")] },
];
export const VARIANTS: { key: string; label: string; count: number; kind: string }[] = [
  { key: "ca", label: "CA Test", count: 20, kind: "Diagnostic test" },
  { key: "exam", label: "Terminal Examination", count: 40, kind: "Examination simulation" },
  { key: "practice", label: "Full Practice Paper", count: 40, kind: "Full mock" },
];
const MATHS_TOPICS = ["algebra equations", "percentages", "ratio", "statistics mean median", "quadratic factors", "indices", "area volume", "probability", "fractions", "pythagoras"];
const ENG_TOPICS = ["tenses verb concord", "parts of speech", "comprehension", "vocabulary", "punctuation sentences", "essay writing"];

/** Creates the CA test, terminal examination and practice paper for every subject of every course. Questions are filled in when first opened. */
export async function loadExamPrep(schoolId: string, by: string): Promise<{ made: number; total: number }> {
  let made = 0, total = 0;
  for (const c of PREP) for (const s of c.subjects) for (const v of VARIANTS) {
    total++;
    const key = `prep|${c.cat}|${s.name}|${v.key}`;
    const [have] = await sql`SELECT id FROM assessments WHERE school_id = ${schoolId} AND kind = 'mock' AND topic = ${key}`;
    if (have) continue;
    await sql`INSERT INTO assessments (school_id, kind, title, topic, duration_min, attempt_limit, randomize, release_mode, status, mock_category, mock_type, created_by)
      VALUES (${schoolId}, 'mock', ${`${c.label}: ${s.name}, ${v.label}`}, ${key}, 70, 5, true, 'immediate', 'published', ${c.cat}, ${v.kind}, ${by})`;
    made++;
  }
  return { made, total };
}

/** Fills one exam-prep paper with questions the first time it is opened. */
export async function fillPrepQuestions(assessmentId: string): Promise<number> {
  const [a] = await sql`SELECT id, school_id, topic FROM assessments WHERE id = ${assessmentId}`;
  if (!a?.topic || !String(a.topic).startsWith("prep|")) return 0;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM assessment_questions WHERE assessment_id = ${assessmentId}`;
  if (n > 0) return n;
  const [, cat, name, variant] = String(a.topic).split("|");
  const course = PREP.find((c) => c.cat === cat), subj = course?.subjects.find((x) => x.name === name), v = VARIANTS.find((x) => x.key === variant);
  if (!course || !subj || !v) return 0;
  const maths = /math/i.test(subj.as), topics = maths ? MATHS_TOPICS : ENG_TOPICS;
  const [sub] = await sql`SELECT id FROM subjects WHERE school_id = ${a.school_id} AND lower(name) = lower(${name})`;
  const subjectId = sub?.id ?? (await sql`INSERT INTO subjects (school_id, name) VALUES (${a.school_id}, ${name}) ON CONFLICT (school_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`)[0].id;
  const level = cat === "common_entrance" ? 6 : cat === "bece" ? 9 : 12;
  const seen = new Set<string>(), qs: ReturnType<typeof periodQuestions> = [];
  for (let round = 0; qs.length < v.count && round < 120; round++) {
    const topic = topics[round % topics.length];
    for (const q of periodQuestions({ subject: subj.as, level, topic, day: (round % 3) + 1, kind: `${a.topic}-${round}`, topicId: String(a.id), wide: true })) {
      if (!seen.has(q.text) && qs.length < v.count) { seen.add(q.text); qs.push(q); }
    }
  }
  const keys = ["a", "b", "c", "d"];
  for (const q of qs) {
    const [row] = await sql`INSERT INTO questions (school_id, subject_id, topic, text, options, correct, explanation, difficulty, marks, source, status, exam_category)
      VALUES (${a.school_id}, ${subjectId}, ${name}, ${q.text}, ${sql.json(q.options.map((text, i) => ({ key: keys[i], text })) as never)}, ${keys[q.answer]}, ${q.explanation}, 'medium', 1, ${`auto:${cat}`}, 'APPROVED', ${cat}) RETURNING id`;
    await sql`INSERT INTO assessment_questions (assessment_id, question_id, marks) VALUES (${assessmentId}, ${row.id}, 1) ON CONFLICT DO NOTHING`;
  }
  void hashSeed;
  return qs.length;
}
