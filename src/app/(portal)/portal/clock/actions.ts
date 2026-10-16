"use server";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit, rateLimit } from "@/lib/security";
import { getSetting } from "@/lib/settings";
import { distanceM, lateMinutes } from "@/lib/geo";

export type ClockResult = { ok?: string; error?: string };
type Rules = { workStart: string; graceMinutes: number; perMinute: number; lateFlat: number; enabled: boolean };

/** Position is checked on the server against the staff member's branch; the browser's claim is never trusted blindly. */
export async function clock(kind: "in" | "out", lat: number, lng: number, accuracy: number): Promise<ClockResult> {
  const me = await requirePerm("clock:create");
  if (!(await rateLimit(`clock:${me.id}`, 20, 3600))) return { error: "Too many attempts. Try again shortly." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: "Your location could not be read. Allow location access and try again." };
  const [p] = await sql`SELECT branch_id FROM staff_profiles WHERE user_id = ${me.id}`;
  if (!p?.branch_id) return { error: "You are not assigned to a branch yet. Ask school management to assign one." };
  const [b] = await sql`SELECT id, name, lat, lng, radius_m FROM branches WHERE id = ${p.branch_id} AND active`;
  if (!b || b.lat == null) return { error: "Your branch has no coordinates set yet." };
  const dist = distanceM({ lat, lng }, { lat: b.lat, lng: b.lng });
  const allowed = b.radius_m + Math.min(Math.max(accuracy || 0, 0), 100);
  if (dist > allowed) {
    await audit({ schoolId: me.schoolId, actorId: me.id, category: "security", action: `clock.${kind}.refused`, meta: { dist, branch: b.name } });
    return { error: `You are about ${dist} m from ${b.name}. Move within ${b.radius_m} m of the branch to clock ${kind}.` };
  }
  const rules = ((await getSetting<Rules>("fines")) ?? {}) as Rules;
  const wat = new Date(Date.now() + 3600_000); // West Africa Time (UTC+1)
  const day = wat.toISOString().slice(0, 10), hm = wat.toISOString().slice(11, 16);
  if (kind === "in") {
    const late = lateMinutes(hm, rules.workStart ?? "08:00", rules.graceMinutes ?? 10);
    const r = await sql`INSERT INTO clock_entries (school_id, user_id, branch_id, day, clock_in, in_lat, in_lng, in_dist_m, late_minutes)
      VALUES (${me.schoolId}, ${me.id}, ${b.id}, ${day}, now(), ${lat}, ${lng}, ${dist}, ${late}) ON CONFLICT (user_id, day) DO NOTHING RETURNING id`;
    if (r.length === 0) return { error: "You have already clocked in today." };
    if (late > 0 && rules.enabled) {
      const amount = (rules.lateFlat ?? 0) + (rules.perMinute ?? 0) * late;
      if (amount > 0) await sql`INSERT INTO fines (school_id, user_id, day, reason, amount) VALUES (${me.schoolId}, ${me.id}, ${day}, ${`Late by ${late} minutes`}, ${amount}) ON CONFLICT DO NOTHING`;
    }
    await audit({ schoolId: me.schoolId, actorId: me.id, action: "clock.in", meta: { dist, late } });
    revalidatePath("/portal/clock");
    return { ok: late > 0 ? `Clocked in at ${hm}. You are ${late} minutes late.` : `Clocked in at ${hm}. On time.` };
  }
  const r = await sql`UPDATE clock_entries SET clock_out = now(), out_lat = ${lat}, out_lng = ${lng}, out_dist_m = ${dist}
                      WHERE user_id = ${me.id} AND day = ${day} AND clock_in IS NOT NULL AND clock_out IS NULL RETURNING id`;
  if (r.length === 0) return { error: "No open clock-in found for today." };
  await audit({ schoolId: me.schoolId, actorId: me.id, action: "clock.out", meta: { dist } });
  revalidatePath("/portal/clock");
  return { ok: `Clocked out at ${hm}.` };
}
