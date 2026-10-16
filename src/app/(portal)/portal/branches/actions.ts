"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, clean } from "@/lib/security";
import { setSetting } from "@/lib/settings";
import { parseCoords } from "@/lib/geo";

type State = { error?: string; ok?: string };

export async function saveBranch(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("branches:manage");
  const name = clean(fd.get("name"), 120);
  const c = parseCoords(clean(fd.get("coords"), 60));
  if (!name) return { error: "Enter the branch name." };
  if (!c) return { error: "Paste the coordinates from Google Maps, for example 6.5244, 3.3792." };
  const radius = Math.min(Math.max(Number(fd.get("radius")) || 150, 30), 2000);
  const id = clean(fd.get("id"), 40);
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    await sql`UPDATE branches SET name = ${name}, address = ${clean(fd.get("address"), 300) || null}, lat = ${c.lat}, lng = ${c.lng}, radius_m = ${radius}, active = ${fd.get("active") === "on"}
              WHERE id = ${id} AND school_id = ${me.schoolId}`;
  } else {
    try {
      await sql`INSERT INTO branches (school_id, name, address, lat, lng, radius_m) VALUES (${me.schoolId}, ${name}, ${clean(fd.get("address"), 300) || null}, ${c.lat}, ${c.lng}, ${radius})`;
    } catch {
      return { error: "A branch with that name already exists." };
    }
  }
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "branch.save", entity: "branch", entityId: id || null, meta: { name } });
  revalidatePath("/portal/branches");
  return { ok: "Branch saved." };
}

export async function saveFineRules(_p: State, fd: FormData): Promise<State> {
  const me = await requirePerm("fines:manage");
  const time = clean(fd.get("workStart"), 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: "Resumption time must look like 08:00." };
  const n = (k: string, max: number) => Math.min(Math.max(Number(fd.get(k)) || 0, 0), max);
  await setSetting("fines", {
    workStart: time, graceMinutes: n("graceMinutes", 180), perMinute: n("perMinute", 100000), lateFlat: n("lateFlat", 10000000),
    absentFine: n("absentFine", 10000000), defaultRadius: Math.max(n("defaultRadius", 2000), 30), enabled: fd.get("enabled") === "on",
  });
  await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: "fines.rules", entity: "settings", entityId: "fines" });
  revalidatePath("/portal/branches");
  return { ok: "Fine rules saved." };
}

export async function assignBranch(fd: FormData): Promise<void> {
  const me = await requirePerm("branches:manage");
  const user = clean(fd.get("user"), 40), branch = clean(fd.get("branch"), 40);
  if (!/^[0-9a-f-]{36}$/i.test(user)) return;
  const b = /^[0-9a-f-]{36}$/i.test(branch) ? branch : null;
  await sql`UPDATE staff_profiles SET branch_id = ${b} WHERE user_id = ${user} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "branch.assign", entity: "user", entityId: user, meta: { branch: b } });
  revalidatePath("/portal/branches");
}

export async function waiveFine(fd: FormData): Promise<void> {
  const me = await requirePerm("fines:manage");
  const id = clean(fd.get("id"), 40);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await sql`UPDATE fines SET status = CASE WHEN status = 'waived' THEN 'applied' ELSE 'waived' END WHERE id = ${id} AND school_id = ${me.schoolId}`;
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "fine.toggle", entity: "fine", entityId: id });
  revalidatePath("/portal/branches");
}
