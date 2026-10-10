"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };
const uuid = (v: unknown) => { const s = clean(v, 40); return /^[0-9a-f-]{36}$/i.test(s) ? s : null; };
const date = (v: unknown) => { const s = clean(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };

export async function addEvent(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (!can(me, "calendar:create") && !can(me, "calendar:edit")) return { error: "Not permitted." };
  const title = clean(fd.get("title"), 160), starts = date(fd.get("starts"));
  if (!title || !starts) return { error: "Enter a title and a start date." };
  const audience = ["all", "students", "parents", "staff"].includes(clean(fd.get("audience"), 10)) ? clean(fd.get("audience"), 10) : "all";
  await sql`INSERT INTO calendar_events (school_id, term_id, kind, title, starts_on, ends_on, audience)
            VALUES (${me.schoolId}, ${uuid(fd.get("termId"))}, ${clean(fd.get("kind"), 20) || "event"}, ${title}, ${starts}, ${date(fd.get("ends"))}, ${audience})`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "calendar.add", meta: { title } });
  revalidatePath("/portal/calendar");
  return { ok: "Date added." };
}

export async function deleteEvent(fd: FormData): Promise<void> {
  const me = await requireMe();
  if (!can(me, "calendar:edit")) return;
  const id = uuid(fd.get("id"));
  if (!id) return;
  await sql`DELETE FROM calendar_events WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "calendar.delete", entityId: id });
  revalidatePath("/portal/calendar");
}

export async function saveTerm(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (!can(me, "calendar:edit")) return { error: "Not permitted." };
  const id = uuid(fd.get("id"));
  if (!id) return { error: "Invalid term." };
  const [t] = await sql`SELECT 1 FROM terms WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!t) return { error: "Term not found." };
  if (fd.get("current") === "on") {
    await sql`UPDATE terms SET is_current = false WHERE school_id = ${me.schoolId}`;
    await sql`UPDATE academic_sessions SET is_current = (id = (SELECT session_id FROM terms WHERE id = ${id})) WHERE school_id = ${me.schoolId}`;
  }
  await sql`UPDATE terms SET starts_on = ${date(fd.get("starts"))}, ends_on = ${date(fd.get("ends"))}, is_current = ${fd.get("current") === "on"} WHERE id = ${id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "term.update", entity: "term", entityId: id });
  revalidatePath("/portal/calendar");
  return { ok: "Term updated." };
}
