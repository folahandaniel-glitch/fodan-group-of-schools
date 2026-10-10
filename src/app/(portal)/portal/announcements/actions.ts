"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { can, requireMe } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

type State = { error?: string; ok?: string };

export async function postAnnouncement(_p: State, fd: FormData): Promise<State> {
  const me = await requireMe();
  if (!can(me, "announcements:create")) return { error: "Not permitted." };
  const title = clean(fd.get("title"), 160), body = clean(fd.get("body"), 4000);
  if (!title || !body) return { error: "Enter a title and message." };
  const audience = clean(fd.get("audience"), 10);
  const aud = ["public", "all", "students", "parents", "staff"].includes(audience) ? audience : "all";
  if (aud === "public" && !can(me, "announcements:publish")) return { error: "You cannot publish public announcements." };
  const kind = ["announcement", "news", "event"].includes(clean(fd.get("kind"), 12)) ? clean(fd.get("kind"), 12) : "announcement";
  const [r] = await sql`INSERT INTO content_items (school_id, kind, title, body, audience, published, created_by) VALUES (${me.schoolId}, ${kind}, ${title}, ${body}, ${aud}, true, ${me.id}) RETURNING id`;
  if (aud !== "public") {
    const roleFilter = aud === "students" ? sql`u.role = 'student'` : aud === "parents" ? sql`u.role = 'parent'` : aud === "staff" ? sql`u.role NOT IN ('student','parent')` : sql`true`;
    await sql`INSERT INTO notifications (user_id, title, body, link) SELECT u.id, ${title}, ${body.slice(0, 160)}, '/portal/announcements' FROM users u
              WHERE u.school_id = ${me.schoolId} AND u.status = 'active' AND ${roleFilter} AND u.id <> ${me.id}`;
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "announcement.post", entity: "content", entityId: r.id, meta: { audience: aud } });
  revalidatePath("/portal/announcements");
  return { ok: "Announcement posted." };
}

export async function removeAnnouncement(fd: FormData): Promise<void> {
  const me = await requireMe();
  const id = clean(fd.get("id"), 40);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !can(me, "announcements:publish")) return;
  await sql`UPDATE content_items SET published = false WHERE id = ${id} AND school_id = ${me.schoolId} AND kind IN ('announcement','news','event')`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "announcement.remove", entityId: id });
  revalidatePath("/portal/announcements");
}
