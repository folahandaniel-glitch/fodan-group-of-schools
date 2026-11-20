import { sql } from "./db";
import { levelName } from "./curriculum";
import { periodQuestions } from "./logic/qgen";

/** Names the scheme of work uses for a subject the school may call something else. */
export function schemeNames(subject: string): string[] {
  const s = subject.toLowerCase().trim(), out = [s];
  if (/further/.test(s)) out.push("further mathematics");
  else if (/math/.test(s)) out.push("mathematics");
  if (/english|language arts|verbal/.test(s) && !/french/.test(s)) out.push("english studies");
  if (/basic science|integrated science|^science/.test(s)) out.push("intermediate science", "basic science and technology");
  if (/basic tech|digital|computer|ict/.test(s)) out.push("digital technologies");
  if (/social|civic|citizenship/.test(s)) out.push("social and citizenship studies", "citizenship and heritage studies");
  if (/crs|crk|christian|bible/.test(s)) out.push("christian religious studies");
  if (/creative|cultural|art/.test(s)) out.push("cultural and creative arts", "visual arts");
  if (/physical|health|phe/.test(s)) out.push("physical and health education");
  if (/pre-?voc|vocational/.test(s)) out.push("pre-vocational studies");
  if (/agric/.test(s)) out.push("agricultural science");
  if (/literature/.test(s)) out.push("literature in english");
  return [...new Set(out)];
}
export const termNo = (name: string) => (/third|3/i.test(name) ? 3 : /second|2/i.test(name) ? 2 : 1);

/**
 * Fills a CA test (20 questions from weeks 1-7) or a terminal exam (40 questions from weeks 1-13) with standard medium questions,
 * built from the scheme of work for that class, subject and term. Does nothing if the assessment already has questions.
 */
export async function loadStandardQuestions(assessmentId: string): Promise<number> {
  const [a] = await sql`SELECT a.id, a.school_id, a.kind, a.class_id, a.subject_id, t.name AS term_name, c.level, s.name AS subject
    FROM assessments a LEFT JOIN terms t ON t.id = a.term_id LEFT JOIN classes c ON c.id = a.class_id LEFT JOIN subjects s ON s.id = a.subject_id WHERE a.id = ${assessmentId}`;
  if (!a || !["ca", "exam"].includes(a.kind as string) || !a.class_id || !a.subject_id) return 0;
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM assessment_questions WHERE assessment_id = ${assessmentId}`;
  if (n > 0) return n;
  const want = a.kind === "ca" ? 20 : 40, maxWeek = a.kind === "ca" ? 7 : 13, tn = termNo((a.term_name as string) ?? "");
  const topics = await sql`SELECT id, topic, week FROM curriculum_topics WHERE school_id = ${a.school_id} AND level = ${a.level} AND term = ${tn} AND teaching AND lower(subject) = ANY(${schemeNames(a.subject as string)})`;
  const usable = topics.filter((t) => (parseInt(t.week as string, 10) || 1) <= maxWeek);
  const pool = usable.length ? usable : topics.length ? topics : [{ id: assessmentId, topic: a.subject as string, week: "1" }];
  const seen = new Set<string>(), qs: ReturnType<typeof periodQuestions> = [];
  for (let round = 0; qs.length < want && round < 40; round++) {
    const t = pool[round % pool.length];
    for (const q of periodQuestions({ subject: a.subject as string, level: (a.level as number) ?? 7, topic: t.topic as string, day: (round % 3) + 1, kind: `${a.kind}-${a.class_id}-${round}`, topicId: String(t.id), wide: true })) {
      if (!seen.has(q.text) && qs.length < want) { seen.add(q.text); qs.push(q); }
    }
  }
  const keys = ["a", "b", "c", "d"];
  for (const q of qs) {
    const [row] = await sql`INSERT INTO questions (school_id, subject_id, class_id, topic, text, options, correct, explanation, difficulty, marks, source, status)
      VALUES (${a.school_id}, ${a.subject_id}, ${a.class_id}, ${String(a.subject)}, ${q.text}, ${sql.json(q.options.map((text, i) => ({ key: keys[i], text })) as never)}, ${keys[q.answer]}, ${q.explanation}, 'medium', 1, ${`auto:${a.kind}:${levelName(a.level as number)}`}, 'APPROVED') RETURNING id`;
    await sql`INSERT INTO assessment_questions (assessment_id, question_id, marks) VALUES (${assessmentId}, ${row.id}, 1) ON CONFLICT DO NOTHING`;
  }
  return qs.length;
}

const EXTRA = ["Coding and robotics for beginners", "Art, craft and design", "Public speaking and debate", "Sports, fitness and games", "Music, drama and dance", "Money skills: saving and budgeting", "Etiquette, leadership and teamwork", "Gardening and caring for the environment", "Reading club and creative writing"];

/** Holiday hub after every term: revision of that term, preparation for the next, and extra-curricular activities. Runs once. */
export async function ensureHolidayPlan(schoolId: string): Promise<void> {
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM holiday_programmes WHERE school_id = ${schoolId} AND title LIKE 'Revision of%'`;
  if (n > 0) return;
  const [{ c }] = await sql`SELECT count(*)::int AS c FROM curriculum_topics WHERE school_id = ${schoolId}`;
  if (c === 0) return;
  const terms = await sql`SELECT t.name, t.starts_on::text AS s, t.ends_on::text AS e FROM terms t JOIN academic_sessions x ON x.id = t.session_id WHERE t.school_id = ${schoolId} ORDER BY x.name DESC, t.name LIMIT 3`;
  const byNo = new Map<number, { s: string | null; e: string | null }>();
  for (const t of terms) byNo.set(termNo(t.name as string), { s: t.s as string | null, e: t.e as string | null });
  const plus = (d: string, k: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
  const base = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);
  const topics = await sql`SELECT level, term, week, topic, id FROM curriculum_topics WHERE school_id = ${schoolId} AND teaching AND lower(subject) IN ('mathematics','english studies')`;
  const pick = (level: number, term: number) => topics.filter((t) => t.level === level && t.term === term).sort((a, b) => (parseInt(a.week as string, 10) || 0) - (parseInt(b.week as string, 10) || 0));
  type Prog = { title: string; level: number; term: number; starts: string; ends: string; sessions: { title: string; topic: string | null }[] };
  const progs: Prog[] = [];
  for (let level = 1; level <= 12; level++) {
    for (let term = 1; term <= 3; term++) {
      const brk = byNo.get(term)?.e ? plus(byNo.get(term)!.e!, 1) : plus(base, (term - 1) * 120);
      const next = term === 3 ? 1 : term + 1, nextLevel = term === 3 ? Math.min(level + 1, 12) : level;
      const rev = pick(level, term), prep = pick(nextLevel, next);
      progs.push({ title: `Revision of Term ${term} (${levelName(level)})`, level, term, starts: brk, ends: plus(brk, 27),
        sessions: Array.from({ length: 13 }, (_, k) => ({ title: `Week ${k + 1} revision: ${rev[k % Math.max(rev.length, 1)]?.topic ?? "key topics of the term"}`, topic: (rev[k % Math.max(rev.length, 1)]?.id as string) ?? null })) });
      progs.push({ title: `Preparation for Term ${next} (${levelName(level)})`, level, term, starts: brk, ends: plus(brk, 27),
        sessions: Array.from({ length: 6 }, (_, k) => ({ title: `Preview: ${prep[k % Math.max(prep.length, 1)]?.topic ?? "the new term's first topics"}`, topic: (prep[k % Math.max(prep.length, 1)]?.id as string) ?? null })) });
      progs.push({ title: `Extra-curricular activities, Term ${term} holiday (${levelName(level)})`, level, term, starts: brk, ends: plus(brk, 27), sessions: EXTRA.map((title) => ({ title, topic: null })) });
    }
  }
  const prows = progs.map((p, i) => ({ i, title: p.title, level: p.level, term: p.term, starts: p.starts, ends: p.ends }));
  const ids = await sql`INSERT INTO holiday_programmes (school_id, title, level, subject, term, starts_on, ends_on, fee)
    SELECT ${schoolId}::uuid, title, level, '', term, starts::date, ends::date, 0 FROM jsonb_to_recordset(${sql.json(prows as never)}) AS x(i int, title text, level int, term int, starts text, ends text) RETURNING id, title, level, term`;
  const key = new Map(ids.map((r) => [`${r.title}|${r.level}|${r.term}`, r.id as string]));
  const srows = progs.flatMap((p) => { const id = key.get(`${p.title}|${p.level}|${p.term}`); return id ? p.sessions.map((s, k) => ({ pid: id, no: k + 1, title: s.title.slice(0, 200), topic: s.topic })) : []; });
  for (let i = 0; i < srows.length; i += 500) await sql`INSERT INTO holiday_sessions (programme_id, session_no, title, topic_id)
    SELECT pid::uuid, no, title, topic::uuid FROM jsonb_to_recordset(${sql.json(srows.slice(i, i + 500) as never)}) AS x(pid text, no int, title text, topic text) ON CONFLICT DO NOTHING`;
}
