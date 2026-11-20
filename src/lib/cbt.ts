import { randomInt } from "node:crypto";
import { sql } from "./db";
import { audit } from "./security";
import { recomputeResult } from "./results";
import { getSetting } from "./settings";
import { award, workPoints } from "./loyalty";
import { DEFAULT_EXAM_ELIGIBILITY } from "./logic/academics";
import { getRules, minutesFor } from "./exam-rules";
import { fillPrepQuestions } from "./exam-prep";
import { loadStandardQuestions } from "./curriculum-auto";
import { getPlatform } from "./platform-server";
import { featureOn } from "./platform";

/** A Lagos wall-clock day and time (e.g. 2026-11-20, 08:30) as a real instant. */
export const lagosAt = (day: string, time: string) => new Date(`${day.slice(0, 10)}T${time.length === 5 ? time : "00:00"}:00+01:00`);

type Plan = { q: string; o: string[] }[];

function shuffle<T>(arr: T[], enabled = true): T[] {
  const a = [...arr];
  if (!enabled) return a;
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type StartResult = { ok: true; attemptId: string; resumed: boolean } | { ok: false; error: string };

export async function startAttempt(assessmentId: string, student: { id: string; class_id: string | null; school_id: string; user_id: string }): Promise<StartResult> {
  const [a] = await sql`SELECT * FROM assessments WHERE id = ${assessmentId} AND school_id = ${student.school_id}`;
  if (!a || a.status !== "published") return { ok: false, error: "This assessment is not available." };
  // A mock may be open to a whole exam category; other kinds are tied to a class.
  if (a.kind !== "mock" && a.class_id !== student.class_id) return { ok: false, error: "This assessment is not assigned to your class." };
  if (a.kind === "mock" && a.class_id && a.class_id !== student.class_id) return { ok: false, error: "This mock is not assigned to your class." };
  if (a.kind === "mock" && a.mock_category) {
    const elig = { ...DEFAULT_EXAM_ELIGIBILITY, ...((await getSetting<Record<string, number[]>>("eligibility")) ?? {}) };
    const [c] = await sql`SELECT level FROM classes WHERE id = ${student.class_id}`;
    if (!c || !(elig[a.mock_category] ?? []).includes(c.level)) return { ok: false, error: "This mock is not available for your class level." };
  }
  const now = new Date();
  const rules = await getRules(), plat = await getPlatform();
  const [grant] = await sql`SELECT id FROM exam_grants WHERE assessment_id = ${assessmentId} AND student_id = ${student.id} AND NOT used AND (window_until IS NULL OR window_until > now()) ORDER BY created_at LIMIT 1`;
  let opensAt = a.start_at ? new Date(a.start_at) : null, closesAt = a.due_at ? new Date(a.due_at) : null, slotMin: number | null = null, inSlot = false;
  if ((a.kind === "ca" || a.kind === "exam") && featureOn(plat, "examTimetableTimes")) {
    const [sl] = await sql`SELECT day::text AS day, start_time, duration_min FROM exam_slots WHERE assessment_id = ${assessmentId} AND class_id = ${student.class_id} LIMIT 1`;
    if (sl) { opensAt = lagosAt(sl.day as string, sl.start_time as string); slotMin = sl.duration_min as number; closesAt = new Date(opensAt.getTime() + slotMin * 60_000); inSlot = true; }
  }
  const minutes = minutesFor(a.kind as string, rules, slotMin, a.duration_min as number);
  if (!grant) {
    if (opensAt && opensAt > now) return { ok: false, error: "This exam has not opened yet. It opens " + opensAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) + "." };
    if (inSlot && opensAt && now.getTime() > opensAt.getTime() + rules.lateEntryMin * 60_000) return { ok: false, error: "Entry for this exam has closed. Please see the exam officer about a make-up." };
    if (closesAt && closesAt < now) return { ok: false, error: "The time for this assessment has passed." };
    if (closesAt && closesAt.getTime() - now.getTime() < 60_000) return { ok: false, error: "Less than a minute is left before this assessment closes." };
  }

  const [open] = await sql`SELECT id, deadline_at FROM attempts WHERE assessment_id = ${assessmentId} AND student_id = ${student.id} AND status = 'in_progress'`;
  if (open) {
    if (new Date(open.deadline_at) > now) return { ok: true, attemptId: open.id, resumed: true };
    await submitAttempt(open.id, "auto");
  }
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM attempts WHERE assessment_id = ${assessmentId} AND student_id = ${student.id}`;
  if (!grant && n >= a.attempt_limit) return { ok: false, error: "You have used all your attempts for this assessment." };

  if (a.kind === "mock" && String(a.topic ?? "").startsWith("prep|")) await fillPrepQuestions(assessmentId);
  if (a.kind === "ca" || a.kind === "exam") await loadStandardQuestions(assessmentId); // standard questions are prepared the first time a paper is opened
  const pool = await sql`SELECT q.id, q.options FROM assessment_questions aq JOIN questions q ON q.id = aq.question_id
                         WHERE aq.assessment_id = ${assessmentId} AND q.status = 'APPROVED'`;
  if (pool.length === 0) return { ok: false, error: "This assessment has no approved questions yet." };
  const drawn = shuffle(pool, a.randomize).slice(0, a.draw_count && a.draw_count > 0 ? a.draw_count : pool.length);
  const plan: Plan = drawn.map((q) => ({ q: q.id, o: shuffle((q.options as { key: string }[]).map((o) => o.key), a.randomize) }));
  let deadline = new Date(now.getTime() + minutes * 60_000);
  if (!grant && closesAt && closesAt < deadline) deadline = closesAt;
  const [row] = await sql`INSERT INTO attempts (assessment_id, student_id, deadline_at, plan, assessment_version)
                          VALUES (${assessmentId}, ${student.id}, ${deadline}, ${sql.json(plan as never)}, ${a.version}) RETURNING id`;
  if (grant) await sql`UPDATE exam_grants SET used = true WHERE id = ${grant.id}`;
  await audit({ schoolId: student.school_id, actorId: student.user_id, action: "exam.start", entity: "assessment", entityId: assessmentId, meta: { attempt: row.id, questions: plan.length } });
  return { ok: true, attemptId: row.id, resumed: false };
}

export async function attemptView(attemptId: string, studentId: string) {
  let [t] = await sql`SELECT * FROM attempts WHERE id = ${attemptId} AND student_id = ${studentId}`;
  if (!t) return null;
  if (t.status === "in_progress" && new Date(t.deadline_at) <= new Date()) {
    await submitAttempt(attemptId, "auto");
    [t] = await sql`SELECT * FROM attempts WHERE id = ${attemptId}`;
  }
  const [a] = await sql`SELECT a.id, a.title, a.kind, a.duration_min, a.instructions, a.release_mode, a.subject_id, sub.name AS subject FROM assessments a LEFT JOIN subjects sub ON sub.id = a.subject_id WHERE a.id = ${t.assessment_id}`;
  const [cand] = await sql`SELECT first_name, last_name, admission_no FROM students WHERE id = ${studentId}`;
  const rules = await getRules(), plat = await getPlatform();
  const plan = t.plan as Plan;
  const qs = await sql`SELECT id, text, options FROM questions WHERE id = ANY(${plan.map((p) => p.q)})`;
  const byId = new Map(qs.map((q) => [q.id, q]));
  const questions = plan.map((p, i) => {
    const q = byId.get(p.q)!;
    const opts = q.options as { key: string; text: string }[];
    return {
      n: i + 1, id: q.id as string, text: q.text as string,
      options: p.o.map((k, j) => ({ key: k, label: "ABCDE"[j], text: opts.find((o) => o.key === k)?.text ?? "" })),
    };
  });
  return {
    attemptId: t.id as string,
    subject: (a.subject ?? "") as string,
    candidate: cand ? `${cand.first_name} ${cand.last_name}` : "", regNo: (cand?.admission_no ?? "") as string,
    violations: t.violations as number, maxAttempts: rules.maxAttempts,
    features: { fullscreen: featureOn(plat, "examFullscreen"), antiCopy: featureOn(plat, "examAntiCopy"), calculator: featureOn(plat, "examCalculator") },
    title: a.title as string, kind: a.kind as string, instructions: (a.instructions ?? "") as string,
    status: t.status as string,
    deadline: new Date(t.deadline_at).getTime(),
    serverNow: Date.now(),
    answers: t.answers as Record<string, string>,
    flags: t.flags as string[],
    questions,
    score: t.status === "submitted" ? Number(t.score) : null,
    maxScore: t.status === "submitted" ? Number(t.max_score) : null,
  };
}

export async function saveProgress(attemptId: string, studentId: string, answers: Record<string, string>, flags: string[]): Promise<{ ok: boolean; expired?: boolean }> {
  const [t] = await sql`SELECT status, deadline_at, plan FROM attempts WHERE id = ${attemptId} AND student_id = ${studentId}`;
  if (!t || t.status !== "in_progress") return { ok: false };
  if (new Date(t.deadline_at).getTime() + 3000 < Date.now()) {
    await submitAttempt(attemptId, "auto");
    return { ok: false, expired: true };
  }
  const plan = t.plan as Plan;
  const clean: Record<string, string> = {};
  for (const p of plan) {
    const v = answers[p.q];
    if (typeof v === "string" && p.o.includes(v)) clean[p.q] = v;
  }
  const f = flags.filter((id) => plan.some((p) => p.q === id));
  await sql`UPDATE attempts SET answers = ${sql.json(clean)}, flags = ${sql.json(f)} WHERE id = ${attemptId} AND status = 'in_progress'`;
  return { ok: true };
}

export async function submitAttempt(attemptId: string, how: "student" | "auto" | "violation" = "student"): Promise<void> {
  const [t] = await sql`SELECT t.*, a.term_id, a.subject_id, a.kind, a.school_id FROM attempts t JOIN assessments a ON a.id = t.assessment_id WHERE t.id = ${attemptId}`;
  if (!t || t.status !== "in_progress") return;
  const plan = t.plan as Plan;
  const marks = await sql`SELECT q.id, q.correct, aq.marks FROM questions q
                          JOIN assessment_questions aq ON aq.question_id = q.id AND aq.assessment_id = ${t.assessment_id}
                          WHERE q.id = ANY(${plan.map((p) => p.q)})`;
  const answers = t.answers as Record<string, string>;
  let score = 0, max = 0, right = 0;
  for (const m of marks) {
    max += Number(m.marks);
    if (answers[m.id] && answers[m.id] === m.correct) { score += Number(m.marks); right++; }
  }
  await sql`UPDATE attempts SET status = 'submitted', submitted_at = now(), score = ${score}, max_score = ${max}, end_reason = ${how}, flagged = flagged OR ${how === "violation"} WHERE id = ${attemptId} AND status = 'in_progress'`;
  const [stu] = await sql`SELECT user_id FROM students WHERE id = ${t.student_id}`;
  if (stu?.user_id && right > 0) await award(t.school_id, stu.user_id, "work", String(t.assessment_id), workPoints(right), `${right} correct in ${t.kind}`);
  await audit({ schoolId: t.school_id, actorId: stu?.user_id, action: "exam.submit", entity: "attempt", entityId: attemptId, meta: { how, score, max } });
  if (t.term_id && t.subject_id && ["assignment", "ca", "exam"].includes(t.kind)) await recomputeResult(t.student_id, t.term_id, t.subject_id);
}

/** One browser tab per exam: the newest tab takes over only if the old one has been silent for 20 seconds. */
export async function claimSession(attemptId: string, studentId: string, clientId: string): Promise<boolean> {
  if (!clientId) return true;
  const [r] = await sql`UPDATE attempts SET client_id = ${clientId}, last_seen = now() WHERE id = ${attemptId} AND student_id = ${studentId}
    AND (client_id IS NULL OR client_id = ${clientId} OR last_seen IS NULL OR last_seen < now() - interval '20 seconds') RETURNING id`;
  return !!r;
}

/** Records one full-screen exit (or tab switch). At the limit the exam is submitted and scored on the spot. */
export async function recordViolation(attemptId: string, studentId: string, type: string): Promise<{ violations: number; submitted: boolean; max: number }> {
  const rules = await getRules();
  const [t] = await sql`UPDATE attempts SET violations = violations + 1, violation_log = violation_log || ${sql.json([{ at: new Date().toISOString(), type: type.slice(0, 30) }])}
    WHERE id = ${attemptId} AND student_id = ${studentId} AND status = 'in_progress' RETURNING violations`;
  if (!t) return { violations: 0, submitted: true, max: rules.maxAttempts };
  const submitted = (t.violations as number) >= rules.maxAttempts;
  if (submitted) await submitAttempt(attemptId, "violation");
  return { violations: t.violations as number, submitted, max: rules.maxAttempts };
}
