"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";

export async function updateMessage(fd: FormData): Promise<void> {
  const me = await requirePerm("comments:edit");
  const id = clean(fd.get("id"), 40), status = clean(fd.get("status"), 12);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["new", "in_progress", "resolved", "archived"].includes(status)) return;
  await sql`UPDATE contact_messages SET status = ${status}, reply = ${clean(fd.get("reply"), 2000) || null} WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "comment.update", entity: "contact_message", entityId: id, meta: { status } });
  revalidatePath("/portal/comments");
}
