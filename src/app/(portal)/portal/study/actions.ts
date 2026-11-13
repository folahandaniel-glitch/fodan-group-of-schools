"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe, requirePerm } from "@/lib/auth";
import { audit, clean, platformOf, safeUrl } from "@/lib/security";
import { importScheme } from "@/lib/curriculum";
import { award } from "@/lib/loyalty";
import { POINTS } from "@/lib/logic/loyalty";

type State = { error?: string; ok?: string };
const UUID = /^[0-9a-f-]{36}$/i;
const refresh = (id?: string) => { revalidatePath("/portal/study"); revalidatePath("/portal/study/manage"); if (id) revalidatePath(`/portal/study/topic/${id}`); };

async function topicOf(schoolId: string, id: string) {
  if (!UUID.test(id)) return null;
  const [t] = await sql`SELECT id, level, subject FROM curriculum_topics WHERE id = ${id} AND school_id = ${schoolId}`;
  return (t ?? null) as { id: string; level: number; subject: string } | null;
}

export async function loadScheme(_p: State, _fd: FormData): Promise<State> {
  const me = await requirePerm("curriculum:manage");
  const r = await importScheme(me.schoolId);
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "curriculum.import", entity: "curriculum", meta: r });
  refresh();
  return { ok: `${r.added} topics added. ${r.total} topics in the scheme of work.` };
}

export async function saveTopic(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("curriculum:manage");
  const id = clean(fd.get("id"), 40);
  const level = Number(fd.get("level")), term = Number(fd.get("term"));
  const subject = clean(fd.get("subject"), 80), topic = clean(fd.get("topic"), 200);
  if (!(level >= 1 && level <= 12) || ![1, 2, 3].includes(term) || !subject || !topic) return { error: "Choose the class, term and subject, and enter the topic." };
  const week = clean(fd.get("week"), 12), content = clean(fd.get("content"), 1500), teaching = fd.get("teaching") === "on";
  try {
    if (UUID.test(id)) await sql`UPDATE curriculum_topics SET level = ${level}, term = ${term}, subject = ${subject}, week = ${week}, topic = ${topic}, content = ${content}, teaching = ${teaching} WHERE id = ${id} AND school_id = ${me.schoolId}`;
    else await sql`INSERT INTO curriculum_topics (school_id, level, subject, term, week, topic, content, teaching) VALUES (${me.schoolId}, ${level}, ${subject}, ${term}, ${week}, ${topic}, ${content}, ${teaching})`;
  } catch { return { error: "That topic already exists for the same class, term and week." }; }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "curriculum.topic.save", entity: "curriculum_topic", entityId: UUID.test(id) ? id : null });
  refresh(id);
  return { ok: "Topic saved." };
}

export async function deleteTopic(fd: FormData): Promise<void> {
  const me = await requirePerm("curriculum:manage");
  const id = clean(fd.get("id"), 40);
  if (UUID.test(id)) await sql`DELETE FROM curriculum_topics WHERE id = ${id} AND school_id = ${me.schoolId}`;
  refresh();
}

export async function saveLesson(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (!can(me, "curriculum:create") && !can(me, "curriculum:edit") && !can(me, "curriculum:manage")) return { error: "You do not have permission to write lessons." };
  const t = await topicOf(me.schoolId, clean(fd.get("topic"), 40));
  const body = String(fd.get("body") ?? "").slice(0, 30000).trim();
  if (!t) return { error: "Topic not found." };
  if (body.length < 20) return { error: "Write the lesson (at least a few sentences)." };
  const status = can(me, "curriculum:manage") ? "approved" : "pending";
  await sql`INSERT INTO topic_lessons (topic_id, body, status, author_id, approved_by) VALUES (${t.id}, ${body}, ${status}, ${me.id}, ${status === "approved" ? me.id : null})
            ON CONFLICT (topic_id) DO UPDATE SET body = EXCLUDED.body, status = EXCLUDED.status, author_id = EXCLUDED.author_id, approved_by = EXCLUDED.approved_by, updated_at = now()`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "curriculum.lesson.save", entity: "curriculum_topic", entityId: t.id, meta: { status } });
  refresh(t.id);
  return { ok: status === "approved" ? "Lesson published." : "Lesson saved and sent for approval." };
}

export async function reviewLesson(fd: FormData): Promise<void> {
  const me = await requirePerm("curriculum:manage");
  const id = clean(fd.get("topic"), 40), op = clean(fd.get("op"), 10);
  const t = await topicOf(me.schoolId, id);
  if (!t) return;
  if (op === "approve") await sql`UPDATE topic_lessons SET status = 'approved', approved_by = ${me.id} WHERE topic_id = ${t.id}`;
  if (op === "reject") await sql`DELETE FROM topic_lessons WHERE topic_id = ${t.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: `curriculum.lesson.${op}`, entity: "curriculum_topic", entityId: t.id });
  refresh(t.id);
}

export async function addResource(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (!can(me, "curriculum:create") && !can(me, "curriculum:manage")) return { error: "You do not have permission to add resources." };
  const t = await topicOf(me.schoolId, clean(fd.get("topic"), 40));
  const title = clean(fd.get("title"), 160), url = safeUrl(clean(fd.get("url"), 500));
  if (!t) return { error: "Topic not found." };
  if (!title || !url) return { error: "Enter a title and a valid link (https://…)." };
  const [subj] = await sql`SELECT id FROM subjects WHERE school_id = ${me.schoolId} AND lower(name) = lower(${t.subject}) LIMIT 1`;
  const platform = platformOf(url);
  const kind = /youtu/.test(url) ? "youtube" : /\.pdf($|\?)/i.test(url) ? "pdf" : "link";
  const publish = can(me, "curriculum:manage");
  await sql`INSERT INTO resources (school_id, title, subject_id, topic, kind, url, platform, published, uploaded_by, topic_id)
            VALUES (${me.schoolId}, ${title}, ${subj?.id ?? null}, ${t.subject}, ${kind}, ${url}, ${platform}, ${publish}, ${me.id}, ${t.id})`;
  refresh(t.id);
  return { ok: publish ? "Resource added." : "Resource added and sent for approval." };
}

export async function reviewResource(fd: FormData): Promise<void> {
  const me = await requirePerm("curriculum:manage");
  const id = clean(fd.get("id"), 40), op = clean(fd.get("op"), 10), topic = clean(fd.get("topic"), 40);
  if (!UUID.test(id)) return;
  if (op === "approve") await sql`UPDATE resources SET published = true WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (op === "remove") await sql`DELETE FROM resources WHERE id = ${id} AND school_id = ${me.schoolId}`;
  refresh(topic);
}

export async function toggleStudied(fd: FormData): Promise<void> {
  const me = await requireMe();
  if (me.role !== "student") return;
  const t = await topicOf(me.schoolId, clean(fd.get("topic"), 40));
  if (!t) return;
  const [had] = await sql`DELETE FROM topic_progress WHERE user_id = ${me.id} AND topic_id = ${t.id} RETURNING 1`;
  if (!had) { await sql`INSERT INTO topic_progress (user_id, topic_id) VALUES (${me.id}, ${t.id}) ON CONFLICT DO NOTHING`; await award(me.schoolId, me.id, "study", t.id, POINTS.topicStudied, "Finished a study topic"); }
  refresh(t.id);
}
