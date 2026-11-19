"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { TOPICS } from "@/data/knowledge";

type State = { error?: string; ok?: string };

export async function addEntry(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("knowledge:manage");
  const topic = TOPICS.find((t) => t.key === clean(fd.get("topic"), 20));
  const title = clean(fd.get("title"), 160), body = clean(fd.get("body"), 3000);
  if (!topic || !title || body.length < 5) return { error: "Choose the topic and write the title and the entry." };
  const r = await sql`INSERT INTO kh_entries (school_id, topic, title, body, audience, created_by) VALUES (${me.schoolId}, ${topic.key}, ${title}, ${body}, ${topic.audience}, ${me.id}) ON CONFLICT (school_id, topic, title) DO UPDATE SET body = EXCLUDED.body RETURNING id`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "knowledge.save", entity: "kh_entry", entityId: r[0].id as string });
  revalidatePath("/portal/knowledge");
  return { ok: "Saved." };
}
export async function deleteEntry(fd: FormData): Promise<void> {
  const me = await requirePerm("knowledge:manage");
  const id = clean(fd.get("id"), 40);
  if (/^[0-9a-f-]{36}$/i.test(id)) await sql`DELETE FROM kh_entries WHERE id = ${id} AND school_id = ${me.schoolId}`;
  revalidatePath("/portal/knowledge");
}
