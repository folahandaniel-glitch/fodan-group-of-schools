"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { can, requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { currentTerm } from "@/lib/settings";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };

import { LESSON_FIELDS } from "@/lib/logic/lesson";

export async function saveLesson(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("lessons:create");
  const id = uuid(fd.get("id"));
  const topic = clean(fd.get("topic"), 200);
  if (!topic) return { error: "Enter the topic." };
  const body: Record<string, string> = {};
  for (const k of LESSON_FIELDS) body[k] = clean(fd.get(k), 6000);
  const term = await currentTerm();
  const vals = {
    classId: uuid(fd.get("classId")), subjectId: uuid(fd.get("subjectId")), termId: uuid(fd.get("termId")) ?? term?.id ?? null,
    week: Number(fd.get("week")) || null, date: clean(fd.get("lessonDate"), 10) || null,
  };
  if (id) {
    const [l] = await sql`SELECT teacher_id, status FROM lesson_notes WHERE id = ${id} AND school_id = ${me.schoolId}`;
    if (!l) return { error: "Lesson note not found." };
    if (l.teacher_id !== me.id && !can(me, "lessons:manage")) return { error: "You can only edit your own lesson notes." };
    if (["approved", "published"].includes(l.status) && !can(me, "lessons:manage")) return { error: "Approved notes are locked. Ask a reviewer to reopen." };
    await sql`UPDATE lesson_notes SET class_id = ${vals.classId}, subject_id = ${vals.subjectId}, term_id = ${vals.termId}, week = ${vals.week},
              lesson_date = ${vals.date}, topic = ${topic}, subtopic = ${body.subtopic}, body = ${sql.json(body)}, updated_at = now() WHERE id = ${id}`;
    await audit({ schoolId: me.schoolId, actorId: me.id, action: "lesson.update", entity: "lesson_note", entityId: id });
    return { ok: "Saved." };
  }
  const [r] = await sql`INSERT INTO lesson_notes (school_id, teacher_id, class_id, subject_id, term_id, week, lesson_date, topic, subtopic, body)
                        VALUES (${me.schoolId}, ${me.id}, ${vals.classId}, ${vals.subjectId}, ${vals.termId}, ${vals.week}, ${vals.date}, ${topic}, ${body.subtopic}, ${sql.json(body)}) RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "lesson.create", entity: "lesson_note", entityId: r.id });
  redirect(`/portal/lessons/${r.id}`);
}

const TRANSITIONS: Record<string, { from: string[]; perm?: string; own?: boolean }> = {
  submit: { from: ["draft", "rejected"], own: true },
  approve: { from: ["submitted", "reviewed"], perm: "lessons:approve" },
  review: { from: ["submitted"], perm: "lessons:review" },
  reject: { from: ["submitted", "reviewed"], perm: "lessons:review" },
  publish: { from: ["approved"], perm: "lessons:publish" },
  archive: { from: ["draft", "submitted", "reviewed", "approved", "rejected", "published"], perm: "lessons:archive" },
  reopen: { from: ["approved", "published", "archived", "rejected"], perm: "lessons:manage" },
};
const TARGET: Record<string, string> = { submit: "submitted", approve: "approved", review: "reviewed", reject: "rejected", publish: "published", archive: "archived", reopen: "draft" };

export async function lessonTransition(fd: FormData): Promise<void> {
  const me = await requirePerm("lessons:view");
  const id = uuid(fd.get("id"));
  const op = clean(fd.get("op"), 12);
  const t = TRANSITIONS[op];
  if (!id || !t) return;
  const [l] = await sql`SELECT teacher_id, status FROM lesson_notes WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!l || !t.from.includes(l.status)) return;
  if (t.own && l.teacher_id !== me.id) return;
  if (t.perm && !can(me, t.perm)) return;
  if (["approve", "reject", "review"].includes(op) && l.teacher_id === me.id && me.role !== "super_admin") return; // no self-approval
  await sql`UPDATE lesson_notes SET status = ${TARGET[op]}, reviewer_id = CASE WHEN ${op} IN ('approve','review','reject') THEN ${me.id}::uuid ELSE reviewer_id END,
            review_comment = CASE WHEN ${op} IN ('approve','review','reject') THEN ${clean(fd.get("comment"), 1000) || null} ELSE review_comment END, updated_at = now() WHERE id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `lesson.${op}`, entity: "lesson_note", entityId: id });
  if (["approve", "reject"].includes(op)) {
    await sql`INSERT INTO notifications (user_id, title, body, link) VALUES (${l.teacher_id}, ${`Lesson note ${TARGET[op]}`}, ${clean(fd.get("comment"), 300) || null}, ${`/portal/lessons/${id}`})`;
  }
  revalidatePath(`/portal/lessons/${id}`);
  revalidatePath("/portal/lessons");
}
