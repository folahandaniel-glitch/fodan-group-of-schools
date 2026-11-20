"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { currentTerm } from "@/lib/settings";
import { saveUpload } from "@/lib/files";
import { loadStandardQuestions } from "@/lib/curriculum-auto";
import { loadExamPrep } from "@/lib/exam-prep";
import { addMin, examDays, findClash, generateExamTimetable, type Slot } from "@/lib/logic/exam-tt";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const done = () => { revalidatePath("/portal/exams"); revalidatePath("/portal/exams/integrity"); revalidatePath("/portal/work"); };

async function loadSlots(timetableId: string): Promise<(Slot & { id: string })[]> {
  const rows = await sql`SELECT id, class_id, subject_id, day::text AS day, start_time, duration_min FROM exam_slots WHERE timetable_id = ${timetableId}`;
  return rows.map((r) => ({ id: r.id as string, classId: r.class_id as string, subjectId: r.subject_id as string, day: String(r.day).slice(0, 10), start: r.start_time as string, minutes: r.duration_min as number }));
}

/** Builds a clash-free timetable for the chosen classes between two dates. */
export async function generateTimetable(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("exams:manage");
  const name = clean(fd.get("name"), 120), kind = clean(fd.get("kind"), 6) === "ca" ? "ca" : "exam";
  const start = clean(fd.get("start"), 10), end = clean(fd.get("end"), 10);
  if (!name) return { error: "Give the timetable a name." };
  if (!DATE.test(start) || !DATE.test(end) || end < start) return { error: "Enter the first and last day of the exams." };
  const sessions = clean(fd.get("sessions"), 80).split(/[,\s]+/).filter((t) => TIME.test(t)).slice(0, 5);
  if (sessions.length === 0) return { error: "Enter at least one start time, like 08:30, 11:00." };
  const minutes = Math.min(Math.max(Math.round(Number(fd.get("minutes")) || (kind === "ca" ? 45 : 90)), 15), 240);
  const which = clean(fd.get("classes"), 6);
  const classes = await sql`SELECT c.id, c.level FROM classes c WHERE c.school_id = ${me.schoolId} AND NOT c.archived`;
  const gen = [];
  for (const c of classes) {
    const subs = await sql`SELECT s.id, s.name FROM class_subjects cs JOIN subjects s ON s.id = cs.subject_id WHERE cs.class_id = ${c.id} ORDER BY s.name`;
    if (subs.length) gen.push({ id: c.id as string, level: c.level as number, subjects: subs.map((s) => ({ id: s.id as string, name: s.name as string })) });
  }
  const chosen = which === "all" ? gen : gen.filter((c) => fd.getAll("cls").map(String).includes(c.id));
  if (chosen.length === 0) return { error: "No classes with subjects were found. Assign subjects to the classes first, or tick the classes." };
  const hol = (await sql`SELECT day::text AS d FROM hr_holidays WHERE school_id = ${me.schoolId} AND day BETWEEN ${start} AND ${end}`).map((r) => String(r.d).slice(0, 10));
  const days = examDays(start, end, hol);
  if (days.length === 0) return { error: "There are no school days between those dates." };
  const { slots, problems } = generateExamTimetable({ days, sessions, minutes, classes: chosen });
  if (slots.length === 0) return { error: problems[0] ?? "Nothing could be scheduled." };
  const term = await currentTerm();
  const [t] = await sql`INSERT INTO exam_timetables (school_id, term_id, kind, name, start_date, end_date, created_by) VALUES (${me.schoolId}, ${term?.id ?? null}, ${kind}, ${name}, ${start}, ${end}, ${me.id}) RETURNING id`;
  const part = slots.map((s) => ({ class_id: s.classId, subject_id: s.subjectId, day: s.day, start_time: s.start, duration_min: s.minutes }));
  await sql`INSERT INTO exam_slots (timetable_id, school_id, class_id, subject_id, day, start_time, duration_min)
    SELECT ${t.id}::uuid, ${me.schoolId}::uuid, class_id, subject_id, day::date, start_time, duration_min FROM jsonb_to_recordset(${sql.json(part as never)}) AS x(class_id uuid, subject_id uuid, day text, start_time text, duration_min int)`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "exam_tt.generate", entity: "exam_timetable", entityId: t.id, meta: { slots: slots.length, classes: chosen.length } });
  done();
  return { ok: `Timetable created with ${slots.length} papers for ${chosen.length} classes. No class has two papers at the same time.${problems.length ? " Note: " + problems.join(" ") : ""} Review it, then publish.` };
}

/** Draws one paper by hand, refusing a clash for the same class. */
export async function addSlot(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("exams:manage");
  const tt = clean(fd.get("tt"), 40), cls = clean(fd.get("class"), 40), sub = clean(fd.get("subject"), 40), day = clean(fd.get("day"), 10), start = clean(fd.get("start"), 5);
  const minutes = Math.min(Math.max(Math.round(Number(fd.get("minutes")) || 60), 10), 300);
  if (![tt, cls, sub].every((x) => UUID.test(x)) || !DATE.test(day) || !TIME.test(start)) return { error: "Choose the class, subject, day and start time." };
  const [t] = await sql`SELECT id FROM exam_timetables WHERE id = ${tt} AND school_id = ${me.schoolId}`;
  if (!t) return { error: "Timetable not found." };
  const cand: Slot = { classId: cls, subjectId: sub, day, start, minutes };
  const have = await loadSlots(tt);
  if (have.some((s) => s.classId === cls && s.subjectId === sub)) return { error: "This class already has that subject on the timetable. Delete it first to move it." };
  const clash = findClash(have, cand);
  if (clash) return { error: `Clash: that class already has a paper from ${clash.start} to ${addMin(clash.start, clash.minutes)} on ${clash.day}.` };
  await sql`INSERT INTO exam_slots (timetable_id, school_id, class_id, subject_id, day, start_time, duration_min) VALUES (${tt}, ${me.schoolId}, ${cls}, ${sub}, ${day}, ${start}, ${minutes})`;
  done();
  return { ok: "Paper added." };
}

export async function deleteSlot(fd: FormData): Promise<void> {
  const me = await requirePerm("exams:manage");
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`DELETE FROM exam_slots WHERE id = ${id} AND school_id = ${me.schoolId}`;
  done();
}

/** Publishing links each paper to its CA or exam assessment (creating a draft one if needed) so the times take effect. */
export async function publishTimetable(fd: FormData): Promise<void> {
  const me = await requirePerm("exams:manage");
  const id = clean(fd.get("id"), 40), op = clean(fd.get("op"), 10);
  if (!UUID.test(id)) return;
  const [t] = await sql`SELECT * FROM exam_timetables WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!t) return;
  if (op === "delete") { await sql`DELETE FROM exam_timetables WHERE id = ${id}`; done(); return; }
  if (op === "unpublish") { await sql`UPDATE exam_timetables SET status = 'draft' WHERE id = ${id}`; await sql`UPDATE exam_slots SET assessment_id = NULL WHERE timetable_id = ${id}`; done(); return; }
  const slots = await sql`SELECT sl.id, sl.class_id, sl.subject_id, sl.day::text AS day, sl.start_time, sl.duration_min, s.name AS subject, c.name AS cname, c.arm FROM exam_slots sl JOIN subjects s ON s.id = sl.subject_id JOIN classes c ON c.id = sl.class_id WHERE sl.timetable_id = ${id}`;
  for (const sl of slots) {
    const day = String(sl.day).slice(0, 10), startAt = new Date(`${day}T${sl.start_time}:00+01:00`), endAt = new Date(startAt.getTime() + (sl.duration_min as number) * 60_000);
    let [a] = await sql`SELECT id FROM assessments WHERE school_id = ${me.schoolId} AND kind = ${t.kind} AND class_id = ${sl.class_id} AND subject_id = ${sl.subject_id} AND term_id IS NOT DISTINCT FROM ${t.term_id} AND topic_id IS NULL ORDER BY created_at DESC LIMIT 1`;
    if (a) await sql`UPDATE assessments SET start_at = ${startAt}, due_at = ${endAt}, duration_min = ${sl.duration_min} WHERE id = ${a.id}`;
    else [a] = await sql`INSERT INTO assessments (school_id, kind, title, subject_id, class_id, term_id, start_at, due_at, duration_min, attempt_limit, randomize, release_mode, created_by)
      VALUES (${me.schoolId}, ${t.kind}, ${`${sl.subject} ${t.kind === "ca" ? "CA test" : "examination"}`}, ${sl.subject_id}, ${sl.class_id}, ${t.term_id}, ${startAt}, ${endAt}, ${sl.duration_min}, 1, true, 'manual', ${me.id}) RETURNING id`;
    await sql`UPDATE exam_slots SET assessment_id = ${a.id} WHERE id = ${sl.id}`;
    const nq = await loadStandardQuestions(a.id as string);
    if (nq > 0) await sql`UPDATE assessments SET status = 'published' WHERE id = ${a.id} AND status = 'draft'`;
  }
  await sql`UPDATE exam_timetables SET status = 'published' WHERE id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "exam_tt.publish", entity: "exam_timetable", entityId: id, meta: { slots: slots.length } });
  done();
}

/** Attach a timetable that was made elsewhere (PDF or image) so everyone can open it. */
export async function uploadTimetable(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("exams:manage");
  const name = clean(fd.get("name"), 120), start = clean(fd.get("start"), 10), end = clean(fd.get("end"), 10), kind = clean(fd.get("kind"), 6) === "ca" ? "ca" : "exam";
  if (!name || !DATE.test(start) || !DATE.test(end)) return { error: "Enter a name and the first and last day." };
  const r = await saveUpload(fd.get("file") as File | null, { schoolId: me.schoolId, userId: me.id, allow: ["pdf", "png", "jpg", "jpeg", "webp"] });
  if (!r.ok) return { error: r.error };
  const term = await currentTerm();
  await sql`INSERT INTO exam_timetables (school_id, term_id, kind, name, start_date, end_date, status, file_id, created_by) VALUES (${me.schoolId}, ${term?.id ?? null}, ${kind}, ${name}, ${start}, ${end}, 'published', ${r.id}, ${me.id})`;
  done();
  return { ok: "Timetable file attached and published." };
}

/** Allow a retake, or assign a make-up mock, to one student. */
export async function grantExam(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("exams:manage");
  const student = clean(fd.get("student"), 40), assessment = clean(fd.get("assessment"), 40), kind = clean(fd.get("kind"), 8) === "makeup" ? "makeup" : "retake";
  const days = Math.min(Math.max(Math.round(Number(fd.get("days")) || 3), 1), 60);
  if (!UUID.test(student) || !UUID.test(assessment)) return { error: "Choose the student and the exam." };
  const [s] = await sql`SELECT id FROM students WHERE id = ${student} AND school_id = ${me.schoolId}`;
  const [a] = await sql`SELECT id, title FROM assessments WHERE id = ${assessment} AND school_id = ${me.schoolId}`;
  if (!s || !a) return { error: "Student or exam not found." };
  await sql`INSERT INTO exam_grants (school_id, assessment_id, student_id, kind, reason, window_until, granted_by) VALUES (${me.schoolId}, ${assessment}, ${student}, ${kind}, ${clean(fd.get("reason"), 200) || null}, now() + make_interval(days => ${days}), ${me.id})`;
  await sql`UPDATE assessments SET status = 'published' WHERE id = ${assessment} AND status = 'draft' AND kind = 'mock'`;
  await sql`INSERT INTO notifications (user_id, title, body, link) SELECT user_id, ${kind === "makeup" ? "You have been given a make-up exam" : "You may retake an exam"}, ${a.title as string}, '/portal/work' FROM students WHERE id = ${student} AND user_id IS NOT NULL`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `exam.grant.${kind}`, entity: "assessment", entityId: assessment, meta: { student, days } });
  done();
  return { ok: kind === "makeup" ? "Make-up exam assigned." : "Retake allowed." };
}

export async function revokeGrant(fd: FormData): Promise<void> {
  const me = await requirePerm("exams:manage");
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`DELETE FROM exam_grants WHERE id = ${id} AND school_id = ${me.schoolId} AND NOT used`;
  done();
}

/** Plain form version of grantExam for the buttons on the integrity page. */
export async function grantExamForm(fd: FormData): Promise<void> { await grantExam({}, fd); }

/** Creates a CA test and a terminal exam for every class and subject this term and fills each with standard questions. */
export async function loadTermAssessments(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("exams:manage");
  void fd;
  const term = await currentTerm();
  if (!term) return { error: "Set the current term first (Settings, Academic calendar)." };
  const pairs = [...(await sql`SELECT cs.class_id, cs.subject_id FROM class_subjects cs JOIN classes c ON c.id = cs.class_id WHERE c.school_id = ${me.schoolId} AND NOT c.archived`)] as { class_id: string; subject_id: string }[];
  // every subject of the scheme of work for that class level, even if not yet assigned to the class
  const cls = await sql`SELECT id, level FROM classes WHERE school_id = ${me.schoolId} AND NOT archived`;
  for (const c of cls) {
    const names = await sql`SELECT DISTINCT subject FROM curriculum_topics WHERE school_id = ${me.schoolId} AND level = ${c.level} AND teaching`;
    for (const n of names) {
      const [sub] = await sql`INSERT INTO subjects (school_id, name) VALUES (${me.schoolId}, ${n.subject as string}) ON CONFLICT (school_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
      if (!pairs.some((p) => p.class_id === c.id && p.subject_id === sub.id)) pairs.push({ class_id: c.id as string, subject_id: sub.id as string });
    }
  }
  let made = 0, filled = 0;
  for (const p of pairs) for (const kind of ["ca", "exam"]) {
    let [a] = await sql`SELECT id FROM assessments WHERE school_id = ${me.schoolId} AND kind = ${kind} AND class_id = ${p.class_id} AND subject_id = ${p.subject_id} AND term_id = ${term.id} AND topic_id IS NULL LIMIT 1`;
    if (!a) { [a] = await sql`INSERT INTO assessments (school_id, kind, title, subject_id, class_id, term_id, duration_min, attempt_limit, randomize, release_mode, status, created_by)
      SELECT ${me.schoolId}, ${kind}, s.name || ${kind === "ca" ? " CA test" : " examination"}, ${p.subject_id}, ${p.class_id}, ${term.id}, ${kind === "ca" ? 45 : 70}, 1, true, 'manual', 'published', ${me.id} FROM subjects s WHERE s.id = ${p.subject_id} RETURNING id`; made++; }
    else { const [h] = await sql`SELECT 1 AS x FROM assessment_questions WHERE assessment_id = ${a.id} LIMIT 1`; if (h) filled++; }
  }
  done();
  return { ok: `${made} CA tests and terminal exams created for every subject of every class this term (${filled} already had questions). Standard questions are prepared the first time each paper is opened. Put them on the timetable to set their dates.` };
}

/** Creates a CA test, a terminal examination and a practice paper for every subject of WAEC, NECO, JAMB, IJMB, JUPEB, BECE, Common Entrance, TOEFL, IELTS and SAT. */
export async function loadExamPrepBanks(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("exams:manage");
  void fd;
  const r = await loadExamPrep(me.schoolId, me.id);
  done();
  revalidatePath("/portal/mocks");
  return { ok: `${r.made} new papers created (${r.total - r.made} already existed). Students find them in the Mock centre; questions are prepared the first time a paper is opened.` };
}
