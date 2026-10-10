"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { outranks } from "@/lib/logic/permissions";

async function target(me: { schoolId: string; role: string; id: string }, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === me.id) return null;
  const [u] = await sql`SELECT id, role FROM users WHERE id = ${id} AND school_id = ${me.schoolId}`;
  if (!u || u.role === "super_admin") return null;
  if (me.role !== "super_admin" && !outranks(me.role, u.role)) return null;
  return u as { id: string; role: string };
}

export async function setUserStatus(fd: FormData): Promise<void> {
  const me = await requirePerm("users:manage");
  const u = await target(me, clean(fd.get("id"), 40));
  const status = clean(fd.get("status"), 12);
  if (!u || !["active", "suspended"].includes(status)) return;
  await sql`UPDATE users SET status = ${status}, failed_logins = 0, locked_until = NULL WHERE id = ${u.id}`;
  if (status !== "active") await sql`DELETE FROM sessions WHERE user_id = ${u.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `user.${status === "active" ? "restore" : "suspend"}`, entity: "user", entityId: u.id });
  revalidatePath("/portal/users");
}

export async function revokeSessions(fd: FormData): Promise<void> {
  const me = await requirePerm("users:manage");
  const u = await target(me, clean(fd.get("id"), 40));
  if (!u) return;
  await sql`DELETE FROM sessions WHERE user_id = ${u.id}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "sessions.revoke", entity: "user", entityId: u.id });
  revalidatePath("/portal/users");
}
